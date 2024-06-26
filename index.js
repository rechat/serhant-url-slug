const snowflake = require('snowflake-sdk')
const express = require('express')

require('dotenv').config()

const account = process.env.SNOWFLAKE_ACCOUNT
const username = process.env.SNOWFLAKE_USERNAME
const password = process.env.SNOWFLAKE_PASSWORD
const database = process.env.SNOWFLAKE_DATABASE

const connectionPool = snowflake.createPool(
    {
      account,
      username,
      password,
      authenticator: 'SNOWFLAKE',
      database
    },
    {
      max: 10,
      min: 0
    }
);

const sqlText = `select * from serhant_share.serhant.luxury_presence_property_slugs WHERE mls_property_id ILIKE '%' || :1 LIMIT 1`
const listing = (req, res) => {
    const mlsnumber = req.params.mlsnumber?.split('-').pop()
    if (mlsnumber.length < 4) {
        res.status(400)
        res.end()
        return
    }


    connectionPool.use(async (clientConnection) => {
        await clientConnection.execute({
            sqlText,
            binds:[mlsnumber],
            complete: function (err, stmt, rows)
            {
                const stream = stmt.streamRows();
                let url = false
                stream.on('data', function (row)
                {
                    console.log('Found', mlsnumber, row.SLUG)
                    url = 'https://serhant.com/properties/' + row.SLUG

                });
                stream.on('end', function (row)
                {
                    if (!url) {
                        console.log('Not Found', mlsnumber)
                        url = 'https://serhant.com/properties/' + mlsnumber
                    }

                    res.redirect(url)
                    res.end()
                });
            }
        });
    });

}

const health = (req, res) => {
    res.status(200)
    res.end()
}

const app = express()
app.get('/listing/:mlsnumber', listing)
app.get('/health', health)
app.listen(process.env.PORT || 8080)