import "source-map-support/register";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import * as fs from "fs";
import * as mime_types from "mime-types";
import {isText} from "istextorbinary";

const contentsByFileName: Map<string, Promise<string>> = new Map<string, Promise<string>>();

export const handler: APIGatewayProxyHandler = async (event, _): Promise<APIGatewayProxyResult> => {
    let filename = event.path;
    console.log(filename);

    if (filename === '/') {
        filename = '/index.html';
    }

    try {
        const content = await getFileContent(filename, getBaseHref(event));

        console.log(content)

        return {
            statusCode: 200,
            body: content,
            headers: {
                'Content-Type': mime_types.lookup(filename),
                'Cache-Control': 'no-store'
            },
            isBase64Encoded: !isText(filename)
        }
    } catch (e) {
        if (e instanceof FileNotFoundError) {
            return {
                statusCode: 404,
                body: `${filename} was not found :(`,
                headers: {
                    'Content-Type': 'text/plain'
                }
            }
        }

        throw e;
    }
};

async function getFileContent(filename: string, baseHref: string) : Promise<string> {
    const fileLocation = `static${filename}`;

    if (contentsByFileName.has(fileLocation)) {
        return await contentsByFileName.get(fileLocation);
    }

    if (!(await fileExists(fileLocation))) {
        throw new FileNotFoundError();
    }

    let filePromise: Promise<string>

    if (isText(fileLocation)) {
        filePromise = fs.promises.readFile(fileLocation, {encoding: "utf-8"});
        if (filename === '/index.html') {
            filePromise = filePromise.then(str => str.replace(/\$BASE_HREF/, baseHref))
        }
    } else {
        filePromise = fs.promises.readFile(fileLocation).then(buf => buf.toString('base64'));
    }

    contentsByFileName.set(fileLocation, filePromise)

    return await filePromise;
}

async function fileExists(filename: string) : Promise<boolean> {
    try {
        const stats = await fs.promises.stat(filename)
        return stats.isFile();
    } catch (e) {
        if (e.code === 'ENOENT')
            return false;
        else
            throw e;
    }
}

function getBaseHref(event: APIGatewayProxyEvent): string {
    return `/${event.requestContext.stage}/`;
}

class FileNotFoundError {
}
