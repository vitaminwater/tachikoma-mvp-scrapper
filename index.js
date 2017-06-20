const cheerio = require('cheerio');
const rp = require('request-promise');
const fs = require('fs');

const escapeCsvEntry = (l) => {
  if (typeof l == 'string') {
    l = l.replace(/\|/g, ' ').replace(/\n/g, '\\n');
  } else if (l && l.slice) {
    l = l.join(',');
  }
  return l;
}

const writeCsvLine = (csv, line) => {
  line = line.map(escapeCsvEntry).join('|');
  const p = new Promise((resolve, reject) => csv.write(`${line}\n`, resolve));
  return p;
}

const writeToCsv = (items) => {
  const csv = fs.createWriteStream('results.csv'),
        header = Object.keys(items[0]);
  const p = writeCsvLine(csv, header)
    .then(() => items.reduce((promise, item) => promise.then(writeCsvLine(csv, header.map((key) => item[key]))), Promise.resolve()))
    .then(() => csv.end());
  return p;
}

const sleep = (time) => () => {
  const p = new Promise();
  setTimeout(() => p.resolve(), time);
  return p;
}

const getShops = (pages, pluginPage) => [...Array(105).keys()].reduce((promise, page) => {
  const loader = (pages) => rp({
    uri: `${pluginPage}?page=${page}`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; <Android Version>; <Build Tag etc.>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Mobile Safari/<WebKit Rev>',
    },
    transform: cheerio.load,
  })
    .then(($) => pages.concat($('[itemprop=author]').map((i, author) => $(author).attr('href')).get().filter((item) => pages.indexOf(item) < 0)))
    .then((pages) => { console.log(`loaded page ${page} (current: ${pages.length})`); return pages});
  return promise.then(loader);
}, Promise.resolve(pages));

const getBestSellings = (pages) => pages.reduce((promise, page) => {
  const loader = (itemPages) => rp({
    uri: `${page.replace('http://', 'https://')}/collections/all?sort_by=best-selling`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; <Android Version>; <Build Tag etc.>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Mobile Safari/<WebKit Rev>',
    },
    transform: cheerio.load,
  })
    .then(($) => itemPages.concat($('[href*="/products/"]').map((i, product) => `${page}${$(product).attr('href')}`).get().filter((item, i, newItems) => itemPages.concat(newItems.slice(0, i)).indexOf(item) < 0).slice(0, 3)))
    .then((itemPages) => { console.log(`loaded itemPages at ${page}, (current: ${itemPages.length})`); return itemPages})
    .catch((err) => { console.log(`Error on page ${err.options.uri}`); return itemPages; });
  return promise.then(loader);
}, Promise.resolve([]));

const getItemsData = (itemPages) => itemPages.reduce((promise, itemPage) => {
  const loader = (items) => rp({
    uri: itemPage,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; <Android Version>; <Build Tag etc.>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Mobile Safari/<WebKit Rev>',
    },
    transform: cheerio.load,
  })
    .then(($) => {
      const item = {};

      item.url = $('[property="og:url"]').attr('content') || itemPage;
      item.siteName = $('[property="og:site_name"]').attr('content');
      item.title = $('title').text();
      item.price = $('[property="og:price:amount"]').attr('content');
      item.currency = $('[property="og:price:currency"]').attr('content');
      item.description = $('[name="description"]').attr('content');
      item.pics = $('[property="og:image"]').map((i, metaImage) => $(metaImage).attr('content')).get();
      items.push(item);
      return items;
    })
    .catch((err) => { console.log(`Error on page ${err.options.uri}`); return items; });
  return promise.then(loader);
}, Promise.resolve([]));

getShops([], 'https://apps.shopify.com/oberlo')
  .then(getBestSellings)
  .then(getItemsData)
  .then(writeToCsv)
  .catch((err) => {
    console.log(err);
  });
