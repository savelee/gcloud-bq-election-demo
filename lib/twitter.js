var express = require('express'),
  router = express.Router(),
  Stream = require('user-stream');

var path = require('path');
var machinelearning = require( path.resolve( __dirname, "ml.js" ) ); //added in a later step
var bigquery = require( path.resolve( __dirname, "bigQuery.js" ) );//added in a later step

//setup the twitter stream API, and provide your consumer and access tokens
const stream = new Stream({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

//these will be the political parties to search for
const search_terms = ['VVD', 'MarkRutte', 
  'PvdA', 'PartijvandeArbeid', 'CDA', 'PVV', 'GeertWilders', 'SP',
  'D66', 'ChristenUnie', 'CU', 'GL', 'GroenLinks',
  'SGP', 'PVDD', 'PartijVoorDeDieren', '50PLUS', 'DENK'];

//for totalscores, let's rather work with full numbers
//than floats with lots of decimals. We will also only
//need 2 decimals.
var createNiceNumber = function(num){
  var x = parseInt(num);
  x = (num * 100).toFixed(2);
  return x;
}


//extract all political parties from a tweet
var getAllMatches = function(text) { 
    var matches = [];
    search_terms.forEach(function(term) {
        var regex = `(?:${term})`;
        var re = new RegExp(regex);
        var result  = re.exec(text);
        if(result) matches.push(result[0]);
    });

    return matches;
}

//Once we get tweets, we want to make sure,
//they all get sorted based on the political party shortcode.
//We will extract all the political parties
//it will return an array.
var getParties = function(tweettxt){

  var matches = getAllMatches(tweettxt);

  //make sure we return the short notation of the party
  if(matches[0] === "PartijvandeArbeid") matches[0] = "PvdA";
  if(matches[0] === "ChristenUnie") matches[0] = "CU";
  if(matches[0] === "GroenLinks") matches[0] = "GL";
  if(matches[0] === "PartijVoorDeDieren") matches[0] = "PVDD";
  if(matches[0] === "GeertWilders") matches[0] = "PVV";
  if(matches[0] === "MarkRutte") matches[0] = "VVD";
  
  return matches;
}

var openTwitterStream = function(){

  //We will need to work with Regex, since we don't want to collect spam.
  var regex ='', pRegex='';
  for (term of search_terms) {
    regex += `\\#${term}|\\@${term}|${term}\\s+|\\s+${term}|`
  };

  regex = regex.slice(0,regex.length-1);
  var re = new RegExp(regex);

  //We will only track tweets with the political parties as provided
  //by the search_terms array. Also the language of the tweet needs
  //to be Dutch.
  var params = {
    track: search_terms,
    language: 'nl'
  };

  //this method will open the twitter stream
  stream.stream(params);
  stream.on('data', function(tweet) {

    //Let's not collect return tweets, and tweets need to
    //match our regular expression.
    if (tweet.text.substring(0,2) != 'RT' 
      && re.test(tweet.text)){

        //IIFE? Yeah, we're putting a callback in a callback in callback...
        //..and we need to bind to the original tweet scope.
        machinelearning.getTranslation(tweet.text, function(translation){
          (function(translation){

            machinelearning.getSentiment(translation, function(sentiment){
              (function(sentiment){

                var entities = [];
                var mentions = JSON.stringify(tweet.entities.user_mentions);
                var hashtags = JSON.stringify(tweet.entities.hashtags);
                entities = hashtags.concat(mentions);
        
                //let's normalize the data as much on the JS side.
                //get the parties, based on this clean tweet.
                var parties = getParties(tweet.text);
                //Tweets might not contain multiple parties.
                //For the scope of this blogpost, we will ignore tweets
                //that talk about multiple parties.
                if(parties.length > 1) return; 
               
                var row = {
                  text: tweet.text,
                  created: (parseInt(tweet.timestamp_ms)/1000),
                  coordinates: tweet.coordinates,
                  party: parties[0],
                  score: createNiceNumber(sentiment.documentSentiment.score),
                  magnitude: createNiceNumber(sentiment.documentSentiment.magnitude),
                  hashtags: entities
                };

                console.log("-----");
                console.log(row);
                console.log("-----");
                
                bigquery.insertInBq(row);

              })(sentiment, tweet);
            });

          })(translation, tweet);
        });

    }
  });
  stream.on('error', function(error) {
    console.error(error);
  });
} 

openTwitterStream();
