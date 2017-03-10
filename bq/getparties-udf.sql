CREATE TEMPORARY FUNCTION getParty(tweettxt STRING)
RETURNS STRING
LANGUAGE js AS """
  var party = '';

    try {
        //filter in this row, for a political party
        var search_terms = ['VVD', 'MarkRutte', 
            'PvdA', 'PartijvandeArbeid', 'CDA', 'PVV', 'GeertWilders', 'SP',
            'D66', 'ChristenUnie', 'CU', 'GL', 'GroenLinks',
            'SGP', 'PVDD', 'PartijVoorDeDieren', '50PLUS', 'DENK'];

        var regex =``;
        for (term of search_terms) {
            //regex += `\\#${term}|\\@${term}|${term}\\s+|\\s+${term}|`
            regex += `(?:${term})|`
        };

        regex = regex.slice(0,regex.length-1);
        var re = new RegExp(regex);
        var matches = tweettxt.match(re);

        party = matches;
       
    } catch (e) {}

  return party;
""";
SELECT SUM(score) as totalscore,
  getParty(text) as party, //TODO somethimes a tweet contains multiple parties!
  COUNT('party') as totalparties
FROM dutchelectionstweets.dutchelections
GROUP BY party

