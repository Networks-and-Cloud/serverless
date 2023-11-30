/*
const AWS = require('aws-sdk');
const axios = require('axios');
const dotenv = require('dotenv');
const formData = require('formData');
const Mailgun = require('Mailgun.js');
const { Storage } = require('@google-cloud/storage');



exports.handler = async (event, context) => {
    dotenv.config();
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere'});

    
    mg.messages.create('sandbox-123.mailgun.org', {
        from: "Excited User <mailgun@sandbox-123.mailgun.org>",
        to: ["kale.v@northeastern.edu"],
        subject: "Hello",
        text: "Testing webapp",
        html: "<h1>Testing some Mailgun awesomeness!</h1>"
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.log(err)); // logs any error

};


*/


const AWS = require('aws-sdk');
const axios = require('axios');
const dotenv = require('dotenv')
const formData = require('form-data');
const { Storage } = require('@google-cloud/storage');
/* const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec); */

dotenv.config();

exports.handler = async (event, context) => {
     
        const Message = event.Records[0].Sns.Message;
        console.log(event.Records);
        // Check if the record has the expected Sns property
         const parsedMessage = JSON.parse(Message);
        console.log('Parsed Message:', parsedMessage);
      

  const params = {
    TableName: process.env.dynamoTable,
    
    Item: {
      Email: '${Message.userEmail}',
      Repository: '${Message.submission_url}',
      Timestamp: new Date().toISOString(),
    },
  };
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    await dynamoDB.put(params).promise();

  const storage = new Storage({
    projectId: 'devproject-406403',
    credentials: JSON.parse(Buffer.from(process.env.GOOGLE_ACCESS_KEY, 'base64').toString('utf-8')),
  });

    // Specify the name of your Google Cloud Storage Bucket
    const bucketName = "vidish_cloud_bucket";

    // Define the destination object name in the bucket
     const objectName = '${Message.assignment_id}'/'${Message.id}'/release.zip;

    // Upload the release to Google Cloud Storage
    await storage.bucket(bucketName).upload(downloadPath, {
      destination: objectName,
    });
 
    const mailgun = require('mailgun-js')({

    mailgun_api_key: "8894b0dfdd34b44f1ad1452f73197b88-30b58138-d2904982" ,
    domainName: "networkstructures.pro",
   
});
//console.log("Lambda function invoked with event:", JSON.stringify(event, null, 2));

const data = {
  from: "Helpdesk@networkstructures.pro",
  to: "kale.v@northeastern.edu",
  subject: "Hello",
  

};

    try {
      const body = await mailgun.messages().send(data);
      console.log("Email sent successfully:", body);
    } catch (error) {
      console.error("Email sending failed:", error);
    }
  
}


