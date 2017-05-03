# Hacker News Top Stories

The getLatestNews Azure Function gets the top 50 stories from Hacker News every hour, using the Hacker News API.  With Cognitive Services, the key phrases from the story titles are extracted and stored in DocumentDB, along with other data about the stories (author, score, comment IDs, etc).
