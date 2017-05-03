var request = require('request');

module.exports = function (context) { 

    context.log("starting");
    var count = 50; //number of top posts we want to store

    //get top story IDs from hacker news via API
    getTopStories(context, function (data, context, index) { 
        context.log("getting top stories");
        var allTitles = '';
        var titlesArray = [];
        var topStories = {
            items: []
        };

        //get top 50 items from hacker news via API
        for (var i = 0; i < count; i++) {
           var itemID = data[i];

           //get item by ID
           getItem(context, itemID, i, function (item, context, index) {
               var title = item.title;
               //aggregate all 50 titles together so we can make 1 Cognitive API call, not 50
               allTitles = allTitles + '. ' + title; //concat with period and space to create sentences for Cognitive
               titlesArray.push(title);
               item.rank = index;

               topStories.items.push(item); //insert into javascript object to store all top items from HN

               // get key phrases from Cognitive Services
               if (titlesArray.length == 49) {
                   getKeyPhrases(context, allTitles, topStories);
               }
           })
        }
    });
};

function httpGet(context, index, url, callback) {
    var result;
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            result = JSON.parse(body);
            callback(result, context, index);
        } else {
            context.log( 'httpGet error ' + error);
            context.log( 'httpGet status code ' + response.statusCode);
        }
    });
}

function getTopStories(context, callback) {
    var url = 'https://hacker-news.firebaseio.com/v0/topstories.json';
    httpGet(context, null, url, callback);
}

function getItem(context, ID, index, callback) {
    var url = 'https://hacker-news.firebaseio.com/v0/item/' + ID + '.json';
    httpGet(context, index, url, callback);
}

function getKeyPhrases(context, text, topStories) {
    context.log('getting key phrases');
    var url = 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases';
    var apiKey = process.env.API_KEY;
    var data = {
        "documents": [
            {
            "language": "en",
            "id": "string",
            "text": text
            }
        ]
    }
    var bodyString = JSON.stringify(data);
    var params = {
        url: url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey
        },
        body: bodyString, 
        context: context
    };
    
    request(params, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            result = JSON.parse(body);
            var keyPhrases = result["documents"][0]["keyPhrases"];

            context = params.context;

            //split up the aggregated key phrases and assign to the correct item
            splitKeyPhrases(context, topStories, keyPhrases);
        }
    });
}

function splitKeyPhrases(context, topStories, keyPhrases) {
    context.log("splitting key phrases");

    // for each top story
    for (var i = 0; i < topStories.items.length; i++) {
        item = topStories.items[i];
        var title = item.title;
        var keyPhrasesSmall = [];
        // find and store the key phrases contained in the article's title
        for (var j = 0; j < keyPhrases.length; j++) {
            if (title.includes(keyPhrases[j])) {
                keyPhrasesSmall.push(keyPhrases[j]);
            }
        }
        topStories.items[i].keyPhrases = keyPhrasesSmall; 
    }

    // write results
    var date = new Date;
    context.bindings.outputDocument = {
        "uploadDate": date.toUTCString(),
        "topStories": topStories
    };
    context.log('done');
    context.done();

}
