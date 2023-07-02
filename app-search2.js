'use strict'
const {env} = require('dotenv').config()
const express = require('express');
const fs = require('fs')
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const client = new Client({
    node: 'https://localhost:9200',
    apiKey: 'SXBoTkRva0JHOXotRVphMmZBcVE6Mk8tSVZldVZUTkNkWFF4QTMtbW9lUQ==',
    auth: {
      username: 'elastic',
      password: 'LPzbulGN2FM7znzJS8QJ'
    //   username: process.env.elastic_userid,
    //   password: process.env.elastic_passworrd
    },
    tls: {
      ca: fs.readFileSync('../http_ca.crt'), // Path to your certificate
      rejectUnauthorized: false
    }
  });

  app.use(express.static( 'public' ));

  app.get('/search', async function (req, res) {
    let quote = req.query.quote;
    let character = req.query.character;
    let play = req.query.play;

    let query_str = {};

    if (play) {
      query_str = {
        index: "shakespeare",
        body: {
            query: {
                bool: {
                    must: [
                        { match: {"play_name.keyword": play}},
                        { match: {"text_entry": quote}},
                        { match: {"character.keyword": character}}
                    ]
                }
            }
        }
      };
    } else if (quote && character) {
      query_str = {
        index: "shakespeare",
        body: {
            query: {
                bool: {
                    must: [
                        { match: {"play_name.keyword": play}},
                        { match: {"text_entry": quote}},
                        { match: {"character.keyword": character}}
                    ]
                }
            },
            _source: ["text_entry", "line_number", "speaker"] // Only return these fields
        }
    };
    
    } else {
        return res.json({ error: 'Both quote and character must be provided' });
    }

    try {
        const resp = await client.search(query_str);
        res.json(resp.body.hits.hits);
    } catch (err) {
        console.error(err); // Log the full error
        res.json({ error: 'Error executing search', details: err.message });
    }
});


app.listen(5678, () => {
  console.log('Server is running on port 5678...');
});

app.get('/', function(req, res){
  res.sendFile('index2.html', { root: __dirname + '/public' }); // Serve 'index2.html' when a user visits the root URL
});


// For bonus problem 1
app.get('/plays', async function (req, res) {
    try {
      const resp = await client.search({
        index: "shakespeare",
        body: {
          size: 0,
          aggs: {
            plays: {
              terms: { field: "play_name.keyword", size: 200 } // Increase the size limit as needed
            }
          }
        }
      });
  
      const plays = resp.body.aggregations.plays.buckets.map(bucket => bucket.key);
      res.json(plays);
    } catch (err) {
      console.error(err); // Log the full error
      res.json({ error: 'Error fetching plays', details: err.message });
    }
  });
  