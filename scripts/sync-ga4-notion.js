#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const EVENT_PROPERTIES = {
  lobby_view: 'ロビー表示',
  pack_open: 'パック開封',
  collection_view: 'コレクション表示',
  deck_build_complete: 'デッキ構築完了',
  battle_start: '対戦開始',
  battle_complete: '対戦完了',
  ranked_match_start: 'ランクマッチ開始',
  share_x: 'Xシェア'
};

function base64url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function jstYesterday(now, override) {
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) throw new Error('TARGET_DATE must be YYYY-MM-DD');
    return override;
  }
  const shifted = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  shifted.setUTCDate(shifted.getUTCDate() - 1);
  return shifted.toISOString().slice(0, 10);
}

function parseServiceAccount(raw) {
  if (!raw) throw new Error('GA4_SERVICE_ACCOUNT_JSON is missing');
  let decoded = raw.trim();
  if (!decoded.startsWith('{')) decoded = Buffer.from(decoded, 'base64').toString('utf8');
  const account = JSON.parse(decoded);
  if (!account.client_email || !account.private_key) throw new Error('GA4 service account JSON is incomplete');
  account.private_key = account.private_key.replace(/\\n/g, '\n');
  return account;
}

function makeJwt(account, nowSeconds) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600
  }));
  const unsigned = header + '.' + claims;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key);
  return unsigned + '.' + base64url(signature);
}

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (ignore) { body = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    const message = body && body.message || body && body.error && body.error.message || response.statusText;
    throw new Error(response.status + ' ' + message);
  }
  return body;
}

async function getGoogleAccessToken(account) {
  const assertion = makeJwt(account, Math.floor(Date.now() / 1000));
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const result = await jsonRequest(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!result.access_token) throw new Error('Google OAuth response did not include an access token');
  return result.access_token;
}

async function runGaReport(accessToken, propertyId, request) {
  return jsonRequest('https://analyticsdata.googleapis.com/v1beta/properties/' + encodeURIComponent(propertyId) + ':runReport', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + accessToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify(request)
  });
}

function vocaluFilter(extra) {
  const expressions = [
    { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 'anadayo.github.io', caseSensitive: false } } },
    { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/vocalu/', caseSensitive: true } } }
  ];
  if (extra) expressions.push(extra);
  return { andGroup: { expressions } };
}

function metricRow(report, names) {
  const row = report.rows && report.rows[0];
  const output = {};
  names.forEach((name, index) => {
    const raw = row && row.metricValues && row.metricValues[index] && row.metricValues[index].value;
    output[name] = raw == null ? 0 : Number(raw);
  });
  return output;
}

function eventRows(report) {
  const counts = {};
  Object.keys(EVENT_PROPERTIES).forEach(name => { counts[name] = 0; });
  (report.rows || []).forEach(row => {
    const name = row.dimensionValues && row.dimensionValues[0] && row.dimensionValues[0].value;
    const value = row.metricValues && row.metricValues[0] && Number(row.metricValues[0].value);
    if (Object.prototype.hasOwnProperty.call(counts, name)) counts[name] = Number.isFinite(value) ? value : 0;
  });
  return counts;
}

async function fetchGa4Daily(propertyId, account, date) {
  const accessToken = await getGoogleAccessToken(account);
  const dateRanges = [{ startDate: date, endDate: date }];
  const metricNames = ['screenPageViews', 'activeUsers', 'newUsers', 'sessions', 'userEngagementDuration'];
  const summaryReport = await runGaReport(accessToken, propertyId, {
    dateRanges,
    metrics: metricNames.map(name => ({ name })),
    dimensionFilter: vocaluFilter()
  });
  const summary = metricRow(summaryReport, metricNames);
  const returningReport = await runGaReport(accessToken, propertyId, {
    dateRanges,
    dimensions: [{ name: 'newVsReturning' }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: vocaluFilter()
  });
  let returningUsers = 0;
  (returningReport.rows || []).forEach(row => {
    if (row.dimensionValues && row.dimensionValues[0] && row.dimensionValues[0].value === 'returning') {
      returningUsers += Number(row.metricValues[0].value) || 0;
    }
  });
  const eventNames = Object.keys(EVENT_PROPERTIES);
  const eventsReport = await runGaReport(accessToken, propertyId, {
    dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: vocaluFilter({ filter: { fieldName: 'eventName', inListFilter: { values: eventNames } } })
  });
  return {
    date,
    pageViews: summary.screenPageViews,
    activeUsers: summary.activeUsers,
    newUsers: summary.newUsers,
    returningUsers,
    sessions: summary.sessions,
    averagePlaySeconds: summary.activeUsers > 0 ? Number((summary.userEngagementDuration / summary.activeUsers).toFixed(1)) : 0,
    events: eventRows(eventsReport),
    state: '実測',
    note: 'GA4 Data API実測。平均プレイ時間秒は userEngagementDuration / activeUsers。'
  };
}

function numberProperty(value) {
  return Number.isFinite(value) ? { number: value } : undefined;
}

function notionProperties(report, syncedAt) {
  const properties = {
    '日次レポート': { title: [{ text: { content: report.date + ' VOCALU日次' } }] },
    '日付': { date: { start: report.date } },
    '月': { rich_text: [{ text: { content: report.date.slice(0, 7) } }] },
    'サイト': { url: 'https://anadayo.github.io/vocalu/' },
    '計測元': { select: { name: 'GA4' } },
    '計測状態': { select: { name: report.state } },
    '同期日時': { date: { start: syncedAt } },
    '改善メモ': { rich_text: [{ text: { content: String(report.note || '').slice(0, 1900) } }] }
  };
  const values = {
    'PV': report.pageViews,
    'アクティブユーザー': report.activeUsers,
    '新規ユーザー': report.newUsers,
    '再訪ユーザー': report.returningUsers,
    'セッション': report.sessions,
    '平均プレイ時間秒': report.averagePlaySeconds
  };
  Object.keys(EVENT_PROPERTIES).forEach(name => { values[EVENT_PROPERTIES[name]] = report.events && report.events[name]; });
  Object.keys(values).forEach(name => {
    const property = numberProperty(values[name]);
    if (property) properties[name] = property;
  });
  return properties;
}

async function notionRequest(token, path, method, body) {
  return jsonRequest('https://api.notion.com/v1' + path, {
    method,
    headers: {
      authorization: 'Bearer ' + token,
      'notion-version': '2025-09-03',
      'content-type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function upsertNotion(token, dataSourceId, report, syncedAt) {
  const query = await notionRequest(token, '/data_sources/' + dataSourceId + '/query', 'POST', {
    filter: { property: '日付', date: { equals: report.date } },
    page_size: 10
  });
  const properties = notionProperties(report, syncedAt);
  if (query.results && query.results.length) {
    if (query.results.length > 1) console.warn('Duplicate Notion rows found for ' + report.date + '; updating the first row only.');
    const page = await notionRequest(token, '/pages/' + query.results[0].id, 'PATCH', { properties });
    return { action: 'updated', pageId: page.id };
  }
  const page = await notionRequest(token, '/pages', 'POST', {
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties
  });
  return { action: 'created', pageId: page.id };
}

function unavailableReport(date, reason) {
  return {
    date,
    events: {},
    state: '取得不可',
    note: 'GA4取得失敗: ' + String(reason || 'unknown').slice(0, 1700)
  };
}

async function main() {
  const date = jstYesterday(new Date(), process.env.TARGET_DATE);
  const propertyId = process.env.GA4_PROPERTY_ID;
  const notionToken = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_DATABASE_ID;
  if (!propertyId || !notionToken || !dataSourceId) throw new Error('GA4_PROPERTY_ID, NOTION_TOKEN, and NOTION_DATABASE_ID are required');
  let report;
  let gaError = null;
  try {
    report = await fetchGa4Daily(propertyId, parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT_JSON), date);
  } catch (error) {
    gaError = error;
    console.error('GA4 fetch failed for ' + date + ': ' + error.message);
    report = unavailableReport(date, error.message);
  }
  const result = await upsertNotion(notionToken, dataSourceId, report, new Date().toISOString());
  console.log(JSON.stringify({ date, state: report.state, notion: result.action, pageId: result.pageId }));
  if (gaError) process.exitCode = 1;
}

module.exports = {
  EVENT_PROPERTIES,
  jstYesterday,
  parseServiceAccount,
  metricRow,
  eventRows,
  vocaluFilter,
  notionProperties,
  unavailableReport
};

if (require.main === module) main().catch(error => {
  console.error('VOCALU analytics sync failed: ' + error.message);
  process.exitCode = 1;
});
