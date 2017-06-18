const cheerio = require('cheerio');
const rp = require('request-promise');

[...Array(105).keys()].reduce((promise, page) => {
  const loader = (arr) => rp({
    uri: `https://apps.shopify.com/oberlo?page=${page}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  })
  .then(($) => arr.concat($('[itemprop=author]').map((i, author) => {
    return `${$(author).attr('href')}/collections/all?sort_by=best-selling`;
  }).get()))
  .then((arr) => { console.log(`loaded page ${page}`); return arr})
  return promise.then(loader);
}, Promise.resolve([]))
.then((pages) => {
  console.log(pages);
})
.catch((err) => {
  console.log(err);
});
