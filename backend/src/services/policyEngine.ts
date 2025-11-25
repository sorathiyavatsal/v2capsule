
export interface PolicyStatement {
    Sid?: string;
    Effect: 'Allow' | 'Deny';
    Principal: string | { AWS: string | string[] } | '*'; // Simplified Principal
    Action: string | string[];
    Resource: string | string[];
    Condition?: Record<string, any>;
}

export interface PolicyDocument {
    Version: string;
    Id?: string;
    Statement: PolicyStatement[];
}

export interface EvaluationContext {
    bucketName: string;
    action: string;
    resource: string; // e.g., "arn:aws:s3:::my-bucket/my-object"
    principal?: string; // User ID or ARN
    sourceIp?: string;
}

/**
 * Evaluates a bucket policy against a request context.
 * Returns true if allowed, false if denied (explicit or implicit).
 * Logic:
 * 1. Default Deny.
 * 2. Explicit Deny overrides everything.
 * 3. Explicit Allow grants access.
 */
export function evaluatePolicy(policyJson: string | object, context: EvaluationContext): boolean {
    let policy: PolicyDocument;
    try {
        policy = typeof policyJson === 'string' ? JSON.parse(policyJson) : policyJson;
    } catch (e) {
        console.error('Invalid policy JSON:', e);
        return false; // Fail safe
    }

    if (!policy.Statement || !Array.isArray(policy.Statement)) {
        return false;
    }

    let isAllowed = false;

    for (const statement of policy.Statement) {
        // Check if statement applies to this request
        if (!matchesPrincipal(statement.Principal, context.principal)) continue;
        if (!matchesAction(statement.Action, context.action)) continue;
        if (!matchesResource(statement.Resource, context.resource)) continue;
        // TODO: Implement Condition matching

        if (statement.Effect === 'Deny') {
            return false; // Explicit Deny
        }

        if (statement.Effect === 'Allow') {
            isAllowed = true;
        }
    }

    return isAllowed;
}

function matchesPrincipal(principal: PolicyStatement['Principal'], requestPrincipal?: string): boolean {
    if (principal === '*') return true;
    // TODO: Handle complex Principal objects and specific users
    return false;
}

function matchesAction(action: string | string[], requestAction: string): boolean {
    const actions = Array.isArray(action) ? action : [action];
    return actions.some(a => {
        if (a === '*') return true;
        if (a === requestAction) return true;
        // Handle wildcards like "s3:*" or "s3:Get*"
        if (a.endsWith('*')) {
            const prefix = a.slice(0, -1);
            return requestAction.startsWith(prefix);
        }
        return false;
    });
}

function matchesResource(resource: string | string[], requestResource: string): boolean {
    const resources = Array.isArray(resource) ? resource : [resource];
    return resources.some(r => {
        if (r === '*') return true;
        if (r === requestResource) return true;
        // Handle wildcards
        // Simple wildcard matching for now
        const regexPattern = r.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(requestResource);
    });
}

export function validatePolicyDocument(policy: any): string | null {
    if (!policy.Version) return 'Missing Version';
    if (!policy.Statement || !Array.isArray(policy.Statement)) return 'Missing Statement array';

    for (const stmt of policy.Statement) {
        if (!stmt.Effect || !['Allow', 'Deny'].includes(stmt.Effect)) return 'Invalid Effect';
        if (!stmt.Action) return 'Missing Action';
        if (!stmt.Resource) return 'Missing Resource';
    }

    return null; // Valid
}
