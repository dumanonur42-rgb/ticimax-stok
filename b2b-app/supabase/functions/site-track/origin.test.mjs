import assert from 'node:assert/strict'

const source = await import('./origin.ts')

assert.deepEqual(source.parseSiteOrigin('https://yamansarulman.com'), {
  origin: 'https://yamansarulman.com',
  site: 'yamansarulman'
})
assert.equal(source.parseSiteOrigin('yamansarulman.com'), null)
assert.equal(source.parseSiteOrigin('http://yamansarulman.com'), null)
assert.equal(source.parseSiteOrigin('https://yamansarulman.com:8443'), null)
assert.deepEqual(source.parseSiteOrigin('https://www.rulmansitesi.com/products/1', true), {
  origin: 'https://www.rulmansitesi.com',
  site: 'rulmansitesi'
})
assert.equal(source.parseSiteOrigin('not a url', true), null)
console.log('site-track origin tests passed')
