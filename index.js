const cheerio = require('cheerio');
const rp = require('request-promise');

const getShops = (pages, pluginPage) => [...Array(2).keys()].reduce((promise, page) => {
  const loader = (arr) => rp({
    uri: `${pluginPage}?page=${page}`,
    transform: cheerio.load,
  })
  .then(($) => arr.concat($('[itemprop=author]').map((i, author) => $(author).attr('href')).get().filter((item) => arr.indexOf(item) < 0)))
  .then((arr) => { console.log(`loaded page ${page}`); return arr})
  return promise.then(loader);
}, Promise.resolve(pages));

const getBestSellings = (pages) => pages.reduce((promise, page) => {
  const loader = (items) => rp({
    uri: `${page.replace('http://', 'https://')}/collections/all?sort_by=best-selling`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; <Android Version>; <Build Tag etc.>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Mobile Safari/<WebKit Rev>',
    },
    transform: cheerio.load,
  })
  .then(($) => items.concat($('[href*="/products/"]').map((i, product) => `${page}${$(product).attr('href')}`).get().filter((item, i, newItems) => items.concat(newItems.slice(0, i)).indexOf(item) < 0).slice(0, 3)))
  .then((items) => { console.log(`loaded items at ${page}, (current: ${items.length})`); return items})
  return promise.then(loader);
}, Promise.resolve([]));

getShops([], 'https://apps.shopify.com/oberlo')
.then(getBestSellings)
.then((products) => {
  console.log(products);
})
.catch((err) => {
  console.log(err);
});
