SELECT SUM(score) as totalscore,
  party,
  COUNT(party) as totalparties
FROM dutchelectionstweets.dutchelections
GROUP BY party
ORDER BY totalscore DESC
