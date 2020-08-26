opensdg.dataRounding = function (value) {
  if (value == null) {
    return value
  } else {
    return value.toFixed(2)
  }
};

var indicatorSearch = function () {
  var urlParams = new URLSearchParams(window.location.search);
  var searchTerms = urlParams.get('q');

  if (searchTerms !== null) {
    document.getElementById('search-bar-on-page').value = searchTerms;
    document.getElementById('search-term').innerHTML = searchTerms;

    var searchTermsToUse = searchTerms;
    // This is to allow for searching by indicator with dashes.
    if (searchTerms.split('-').length == 3 && searchTerms.length < 15) {
      // Just a best-guess check to see if the user intended to search for an
      // indicator ID.
      searchTermsToUse = searchTerms.replace(/-/g, '.');
    }

    var useLunr = typeof window.lunr !== 'undefined';
    if (useLunr && opensdg.language != 'en') {
      if (typeof lunr[opensdg.language] === 'undefined') {
        useLunr = false;
      }
    }

    var results = [];
    var alternativeSearchTerms = [];

    if (useLunr) {
      // Engish-specific tweak for words separated only by commas.
      if (opensdg.language == 'en') {
        lunr.tokenizer.separator = /[\s\-,]+/
      }
      if (opensdg.language != 'en' && lunr[opensdg.language]) {

        var trimmerEnRu = function (token) {
          return token.update(function (s) {
            return s.replace(/^[^\wа-яёА-ЯЁ]+/, '')
              .replace(/[^\wа-яёА-ЯЁ]+$/, '')
          })
        };

        lunr.Pipeline.registerFunction(trimmerEnRu, 'trimmer-enru');

        var stopWordFilter = lunr.generateStopWordFilter('алло без близко более больше будем будет будете будешь будто буду будут будь бы бывает бывь был была были было быть в важная важное важные важный вам вами вас ваш ваша ваше ваши вверх вдали вдруг ведь везде весь вниз внизу во вокруг вон восемнадцатый восемнадцать восемь восьмой вот впрочем времени время все всегда всего всем всеми всему всех всею всю всюду вся всё второй вы г где говорил говорит год года году да давно даже далеко дальше даром два двадцатый двадцать две двенадцатый двенадцать двух девятнадцатый девятнадцать девятый девять действительно дел день десятый десять для до довольно долго должно другая другие других друго другое другой е его ее ей ему если есть еще ещё ею её ж же жизнь за занят занята занято заняты затем зато зачем здесь значит и из или им именно иметь ими имя иногда их к каждая каждое каждые каждый кажется как какая какой кем когда кого ком кому конечно которая которого которой которые который которых кроме кругом кто куда лет ли лишь лучше люди м мало между меля менее меньше меня миллионов мимо мира мне много многочисленная многочисленное многочисленные многочисленный мной мною мог могут мож может можно можхо мои мой мор мочь моя моё мы на наверху над надо назад наиболее наконец нам нами нас начала наш наша наше наши не него недавно недалеко нее ней нельзя нем немного нему непрерывно нередко несколько нет нею неё ни нибудь ниже низко никогда никуда ними них ничего но ну нужно нх о об оба обычно один одиннадцатый одиннадцать однажды однако одного одной около он она они оно опять особенно от отовсюду отсюда очень первый перед по под пожалуйста позже пока пор пора после посреди потом потому почему почти прекрасно при про просто против процентов пятнадцатый пятнадцать пятый пять раз разве рано раньше рядом с сам сама сами самим самими самих само самого самой самом самому саму свое своего своей свои своих свою сеаой себе себя сегодня седьмой сейчас семнадцатый семнадцать семь сих сказал сказала сказать сколько слишком сначала снова со собой собою совсем спасибо стал суть т та так такая также такие такое такой там твой твоя твоё те тебе тебя тем теми теперь тех то тобой тобою тогда того тоже только том тому тот тою третий три тринадцатый тринадцать ту туда тут ты тысяч у уж уже уметь хорошо хотеть хоть хотя хочешь часто чаще чего человек чем чему через четвертый четыре четырнадцатый четырнадцать что чтоб чтобы чуть шестнадцатый шестнадцать шестой шесть эта эти этим этими этих это этого этой этом этому этот эту я ﻿а'.split(' '));

        lunr.Pipeline.registerFunction(stopWordFilter, 'stopWordFilter-ru');
      }

      var searchIndex = lunr(function () {
        if (opensdg.language != 'en' && lunr[opensdg.language]) {
          this.pipeline.reset();
          this.pipeline.add(
            trimmerEnRu,
            lunr.stopWordFilter,
            lunr.stemmer,
            lunr.ru.stemmer)
        }

        this.ref('url');
        // Index the expected fields.
        this.field('title', getSearchFieldOptions('title'));
        this.field('content', getSearchFieldOptions('content'));
        this.field('id', getSearchFieldOptions('id'));
        // Index any extra fields.
        var i;
        for (i = 0; i < opensdg.searchIndexExtraFields.length; i++) {
          var extraField = opensdg.searchIndexExtraFields[i];
          this.field(extraField, getSearchFieldOptions(extraField));
        }
        // Index all the documents.
        for (var ref in opensdg.searchItems) {
          this.add(opensdg.searchItems[ref]);
        }

      });
      // Perform the search.
      var results = searchIndex.search(searchTermsToUse);
      // If we didn't find anything, get progressively "fuzzier" to look for
      // alternative search term options.
      if (!results.length > 0) {
        for (var fuzziness = 1; fuzziness < 5; fuzziness++) {
          var fuzzierQuery = getFuzzierQuery(searchTermsToUse, fuzziness);
          var alternativeResults = searchIndex.search(fuzzierQuery);
          if (alternativeResults.length > 0) {
            var matchedTerms = getMatchedTerms(alternativeResults);
            if (matchedTerms) {
              alternativeSearchTerms = matchedTerms;
            }
            break;
          }
        }
      }
    } else {
      // Non-Lunr basic search functionality.
      results = _.filter(opensdg.searchItems, function (item) {
        var i, match = false;
        if (item.title) {
          match = match || item.title.indexOf(searchTermsToUse) !== -1;
        }
        if (item.content) {
          match = match || item.content.indexOf(searchTermsToUse) !== -1;
        }
        for (i = 0; i < opensdg.searchIndexExtraFields.length; i++) {
          var extraField = opensdg.searchIndexExtraFields[i];
          if (typeof item[extraField] !== 'undefined') {
            match = match || item[extraField].indexOf(searchTermsToUse) !== -1;
          }
        }
        return match;
      });
      // Mimic what Lunr does.
      results = _.map(results, function (item) {
        return {ref: item.url}
      });
    }

    var resultItems = [];

    results.forEach(function (result) {
      var doc = opensdg.searchItems[result.ref]
      // Truncate the contents.
      if (doc.content.length > 400) {
        doc.content = doc.content.substring(0, 400) + '...';
      }
      // Indicate the matches.
      doc.content = doc.content.replace(new RegExp('(' + escapeRegExp(searchTerms) + ')', 'gi'), '<span class="match">$1</span>');
      doc.title = doc.title.replace(new RegExp('(' + escapeRegExp(searchTerms) + ')', 'gi'), '<span class="match">$1</span>');
      resultItems.push(doc);
    });

    $('.loader').hide();

    // Print the results using a template.
    var template = _.template(
      $("script.results-template").html()
    );
    $('div.results').html(template({
      searchResults: resultItems,
      resultsCount: resultItems.length,
      didYouMean: (alternativeSearchTerms.length > 0) ? alternativeSearchTerms : false,
    }));
  }

  // Helper function to make a search query "fuzzier", using the ~ syntax.
  // See https://lunrjs.com/guides/searching.html#fuzzy-matches.
  function getFuzzierQuery(query, amountOfFuzziness) {
    return query
      .split(' ')
      .map(function (x) {
        return x + '~' + amountOfFuzziness;
      })
      .join(' ');
  }

  // Helper function to get the matched words from a result set.
  function getMatchedTerms(results) {
    var matchedTerms = {};
    results.forEach(function (result) {
      Object.keys(result.matchData.metadata).forEach(function (matchedTerm) {
        matchedTerms[matchedTerm] = true;
      })
    });
    return Object.keys(matchedTerms);
  }

  // Helper function to get a boost score, if any.
  function getSearchFieldOptions(field) {
    var opts = {}
    if (opensdg.searchIndexBoost[field]) {
      opts['boost'] = parseInt(opensdg.searchIndexBoost[field])
    }
    return opts
  }

  // Used to highlight search term matches on the screen.
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
  };
};

