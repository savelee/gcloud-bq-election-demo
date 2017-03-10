SELECT SUM(score) as totalscore,
  party
FROM dutchelectionstweets.dutchelections
GROUP BY party
ORDER BY totalscore DESC
LIMIT 5