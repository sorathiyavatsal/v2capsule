import { Builder } from 'xml2js';

const builder = new Builder({ headless: true, renderOpts: { pretty: false } });

export function buildS3Response(rootName: string, obj: any): string {
    const xml = builder.buildObject({ [rootName]: { $: { xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/' }, ...obj } });
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

export function buildErrorResponse(code: string, message: string, resource: string, requestId: string): string {
    const xml = builder.buildObject({
        Error: {
            Code: code,
            Message: message,
            Resource: resource,
            RequestId: requestId,
        }
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}
