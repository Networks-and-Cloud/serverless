
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




