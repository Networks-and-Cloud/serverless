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


/*

const AWS = require('aws-sdk');
const axios = require('axios');
const dotenv = require('dotenv')
const formData = require('form-data');
const { Storage } = require('@google-cloud/storage');


dotenv.config();

exports.handler = async (event, context) => {
     
        const Message = event.Records[0].Sns.Message;
        console.log(event.Records);
        // Checking if the record has the expected Sns property
         const parsedMessage = JSON.parse(Message);
        console.log('Parsed Message:', parsedMessage);
      

  const params = {
    TableName: process.env.dynamoTable,
    
    Item: {
      Email: '${Message.email}',
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

    // Specify the name of Google Cloud Storage Bucket
    const bucketName = "vidish_cloud_bucket";

    // Define the destination object name in the bucket
     const objectName = `${Message.assignment_id}`/`${Message.id}`/release.zip;

    // Upload the release to Google Cloud Storage
    await storage.bucket(bucketName).upload(downloadPath, {
      destination: objectName,
    });
 
    const mailgun = require('mailgun-js')({

    mailgun_api_key: "8894b0dfdd34b44f1ad1452f73197b88-30b58138-d2904982" ,
    domainNameName: "networkstructures.pro",
   
});
//console.log("Lambda function invoked with event:", JSON.stringify(event, null, 2));

const data = {
  from: "helpdesk@networkstructures.pro",
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

*/


const AWS = require('aws-sdk');
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const mailgun = require('mailgun-js');
const { v4: uuidv4 } = require("uuid");
const dotenv = require('dotenv');


dotenv.config();

// Initialize AWS SDK
const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Initialize Google Cloud Storage
const googleCred = process.env.key;
const googleCredsJson = Buffer.from(googleCred, 'base64').toString('utf-8');
console.log(googleCredsJson);

// Initialize Google Cloud Storage with credentials
const storage = new Storage({credentials: JSON.parse(googleCredsJson),});
console.log(storage);
//const storage = new Storage();

//const storage = new Storage({ credentials: GOOGLE_CREDENTIALS });
exports.handler = async (event) => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));

        // Extract SNS message
        const Message = JSON.parse(event.Records[0].Sns.Message);
        console.log("SNS Message:", Message);
        console.log("Email:",Message.email);
        console.log("Submission URL:- ", Message.submission_url);
        console.log("Assignment id:- ", Message.assignment_id);

        // GitHub release details
        const githubRepo = Message.submission_url;
        console.log("git hub repo", githubRepo);
        //const releaseTag = Message.releaseTag;


        // Google Cloud Storage details
       
        const bucket = process.env.bucket;
        console.log("bucket",bucket);
        //const objectName = githubRepo;
    //    const objectName = `${Message.assignment_id}`;
        console.log("objectName", Message.assignment_id);


        // DynamoDB details
        // const dynamoDBTable = process.env.dynamoDBTable;


        // Download release from GitHub
     //   const githubReleaseUrl = githubRepo;
        console.log("githubReleaseUrl",Message.submission_url);

        const response = await axios.get(Message.submission_url, { responseType: 'arraybuffer' });
        console.log("response:- " ,response)
        
        // Upload release to Google Cloud Storage
        await storage.bucket(bucket).file(Message.assignment_id).save(response.data);

        // Email user the status of download (replace this with your email sending logic)
        const emailStatus = await sendEmail(Message.email, "Submision success", "Release downloaded successfully!",`gs://${bucket}/${Message.assignment_id}`);
        console.log("Email Status:- ",emailStatus);

        // Track emails sent in DynamoDB
        await trackEmailInDynamoDB(Message.email, Message.submission_url,emailStatus);

        return {

            statusCode: 200,
            body: JSON.stringify('Lambda function executed successfully'),
        };
    } catch (error) {
        const Message = JSON.parse(event.Records[0].Sns.Message);

        console.error("Error:", error);
        await sendEmail(Message.email, "Submission Failed", "We could not locate your file, please try again!!");
        return {
            statusCode: 500,
            body: JSON.stringify('Error executing Lambda function'),
        };
        }
};

async function sendEmail(to, subject, message , gcsBucketPath) {
    const mailgun_api_key = process.env.mailgun_api_key;
    console.log("mailgun_api_key",process.env.mailgun_api_key) ;
    const domainName = process.env.domainName;
    const mg = mailgun({apiKey: process.env.mailgun_api_key,domain:"networkstructures.pro"});

   // const from = `noreply@${domainName}`;
    const from = "helpdesk@networkstructures.pro";
    console.log(to);
    console.log(from);
    const data = {
        from,
        to,
        subject,
        text: `${message}\n\nGCS Bucket Path: ${gcsBucketPath}`,
    };

    try {
        const response = await mg.messages().send(data);
        console.log("Email sent successfully:", response);
        return { success: true, message: "Email sent successfully" };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, message: "Error sending email" };
    }
}

async function trackEmailInDynamoDB(userEmail, fileName, isSuccess) {
    const tableName = process.env.dynamoDBTable;
    const status = isSuccess ? "Success" : "Failure";
    console.log("Status:", status);
    console.log("Email:", userEmail);
    console.log("FileName:", fileName);
    console.log(status);
    let uniqueId = uuidv4();
    console.log(uniqueId);

    const params = {
      TableName: tableName,
      Item: {
        id: uniqueId,
        userEmail: userEmail,
        FileName: fileName,
        timestamp: new Date().toISOString(),
        status: status,
      },
    };
   
    try {
      console.log("Attempting to log email event to DynamoDB", params);
      await dynamoDb.put(params).promise();
      console.log("Successfully logged email event");
    } catch (error) {
        console.error("Error in Lambda function:", error);

        // Add additional logging specific to the DynamoDB operation
        console.error("Error in DynamoDB operation:", error);
    
        return {
            statusCode: 500,
            body: JSON.stringify('Error executing Lambda function'),
        };
        }
  }




