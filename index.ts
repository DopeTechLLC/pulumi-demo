import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as mime from "mime";

const publicDataTag = {
    "DataClassification": "public",
}

const siteBucket = new aws.s3.Bucket(`pulumi-demo-${pulumi.getStack()}`, {
    website: {
        indexDocument: "index.html",
    },
    tags: { 
        ...publicDataTag 
    }
});

const siteBucketWebsiteConfig = new aws.s3.BucketWebsiteConfigurationV2("s3-website-bucket-config", {
    bucket: siteBucket.id,
    indexDocument: {
        suffix: "index.html",
    },
});

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: siteBucket.id,
    blockPublicAcls: false,
});

// For each file in the "www" directory, create an S3 object stored in `siteBucket`
const siteDir = "www";
for (const item of fs.readdirSync(siteDir)) {
    const filePath = require("path").join(siteDir, item);
    const siteObject = new aws.s3.BucketObject(item, {
        bucket: siteBucket,
        source: new pulumi.asset.FileAsset(filePath),
        contentType: mime.getType(filePath) || undefined,
        tags: { 
            ...publicDataTag 
        }
    });
}

const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: siteBucket.id,
    policy: pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: [
                "s3:GetObject",
            ],
            Resource: [
                pulumi.interpolate`${siteBucket.arn}/*`,
            ],
        }],
    }),
}, { dependsOn: publicAccessBlock });

// Stack exports
export const bucketName = siteBucket.bucket;
export const websiteUrl = siteBucketWebsiteConfig.websiteEndpoint;