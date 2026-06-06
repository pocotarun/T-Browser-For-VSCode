import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

// IMPLEMENTATION TRACKING: [GLOBAL_CONFIGURATION] - [ENVIRONMENT_CONSTANTS]
const PROXY_ROUTE_PREFIX = '/__tbrowser_core_stream__/?url=';
const CORPORATE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SEC_CH_UA_HEADER = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"';

// IMPLEMENTATION TRACKING: [DATA_STRUCTURES] - [COOKIE_ENTRY_INTERFACE]
export interface ICookieEntry {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
}

// IMPLEMENTATION TRACKING: [STATE_MANAGEMENT] - [STATEFUL_COOKIE_JAR]
class EnterpriseCookieJar {
    private hostCookieMap: Map<string, Map<string, ICookieEntry>>;

    constructor() {
        this.hostCookieMap = new Map<string, Map<string, ICookieEntry>>();
    }

    // IMPLEMENTATION TRACKING: [STATE_MANAGEMENT] - [COOKIE_PARSING_ENGINE]
    public ingestCookiesFromResponse(hostname: string, setCookieHeader: string | string[] | undefined): void {
        if (!setCookieHeader) {
            return;
        }
        
        const rawHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        
        if (!this.hostCookieMap.has(hostname)) {
            this.hostCookieMap.set(hostname, new Map<string, ICookieEntry>());
        }
        
        const domainJar = this.hostCookieMap.get(hostname)!;

        for (let i = 0; i < rawHeaders.length; i++) {
            const rawCookieString = rawHeaders[i];
            const cookieSegments = rawCookieString.split(';');
            const primaryPair = cookieSegments[0].trim();
            const equalSignIndex = primaryPair.indexOf('=');
            
            if (equalSignIndex !== -1) {
                const cookieName = primaryPair.substring(0, equalSignIndex).trim();
                const cookieValue = primaryPair.substring(equalSignIndex + 1).trim();
                
                domainJar.set(cookieName, {
                    name: cookieName,
                    value: cookieValue
                });
            }
        }
    }

    // IMPLEMENTATION TRACKING: [STATE_MANAGEMENT] - [COOKIE_SERIALIZATION]
    public serializeCookiesForRequest(hostname: string): string {
        const domainJar = this.hostCookieMap.get(hostname);
        if (!domainJar || domainJar.size === 0) {
            return '';
        }
        
        const serializedPairs: string[] = [];
        for (const [cookieName, cookieEntry] of domainJar.entries()) {
            serializedPairs.push(`${cookieName}=${cookieEntry.value}`);
        }
        
        return serializedPairs.join('; ');
    }
}

// IMPLEMENTATION TRACKING: [VIRTUALIZATION_RUNTIME] - [CLIENT_INJECTION_ENGINE]
class JavascriptRuntimeInjector {
    
    // IMPLEMENTATION TRACKING: [VIRTUALIZATION_RUNTIME] - [PAYLOAD_GENERATION]
    public static constructInjectionPayload(activeProxyPort: number, currentActiveOrigin: string): string {
        return `
        <!-- IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [CLIENT_SCRIPT_EXECUTION] -->
        <script>
            (function() {
                const RUNTIME_PORT = ${activeProxyPort};
                const RUNTIME_PREFIX = '${PROXY_ROUTE_PREFIX}';
                const ABSOLUTE_BRIDGE_URL = 'http://127.0.0.1:' + RUNTIME_PORT + RUNTIME_PREFIX;
                const RUNTIME_ORIGIN = '${currentActiveOrigin}';

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [URL_ABSOLUTE_RESOLVER]
                function resolveToAbsoluteProxyUrl(targetUrl) {
                    if (!targetUrl || typeof targetUrl !== 'string') return targetUrl;
                    if (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:') || targetUrl.startsWith('javascript:') || targetUrl.startsWith('#') || targetUrl.startsWith('mailto:')) return targetUrl;
                    if (targetUrl.startsWith('http://127.0.0.1:' + RUNTIME_PORT)) return targetUrl;
                    
                    let resolvedUrl = targetUrl;
                    if (targetUrl.startsWith('/')) {
                        if (targetUrl.startsWith('//')) {
                            resolvedUrl = 'https:' + targetUrl;
                        } else {
                            resolvedUrl = RUNTIME_ORIGIN + targetUrl;
                        }
                    } else if (!targetUrl.startsWith('http')) {
                        try {
                            resolvedUrl = new URL(targetUrl, window.location.href).href;
                        } catch(e) {
                            resolvedUrl = RUNTIME_ORIGIN + '/' + targetUrl;
                        }
                    }
                    
                    let fullyDecodedUrl = resolvedUrl;
                    try { 
                        fullyDecodedUrl = decodeURIComponent(resolvedUrl); 
                    } catch(e) {
                        // Suppress decode errors gracefully
                    }
                    
                    return ABSOLUTE_BRIDGE_URL + encodeURIComponent(fullyDecodedUrl);
                }

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [FETCH_API_OVERRIDE]
                const nativeWindowFetch = window.fetch;
                window.fetch = async function(...fetchArguments) {
                    if (fetchArguments.length > 0) {
                        if (typeof fetchArguments[0] === 'string') {
                            fetchArguments[0] = resolveToAbsoluteProxyUrl(fetchArguments[0]);
                        } else if (fetchArguments[0] instanceof Request) {
                            fetchArguments[0] = new Request(resolveToAbsoluteProxyUrl(fetchArguments[0].url), fetchArguments[0]);
                        }
                    }
                    return nativeWindowFetch.apply(this, fetchArguments);
                };

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [XMLHTTPREQUEST_OVERRIDE]
                const nativeXhrOpenMethod = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(httpMethod, requestUrl, ...additionalArgs) {
                    const proxiedRequestUrl = resolveToAbsoluteProxyUrl(requestUrl);
                    return nativeXhrOpenMethod.call(this, httpMethod, proxiedRequestUrl, ...additionalArgs);
                };

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [FORM_SUBMISSION_OVERRIDE]
                const nativeFormSubmitMethod = HTMLFormElement.prototype.submit;
                HTMLFormElement.prototype.submit = function() {
                    if (this.action) {
                        this.action = resolveToAbsoluteProxyUrl(this.action);
                    }
                    return nativeFormSubmitMethod.apply(this, arguments);
                };

                window.addEventListener('submit', function(submitEvent) {
                    const activeForm = submitEvent.target;
                    if (activeForm && activeForm.action) {
                        activeForm.action = resolveToAbsoluteProxyUrl(activeForm.action);
                    }
                }, true);

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [DOM_MUTATION_OBSERVER]
                const dynamicDomObserver = new MutationObserver((mutationRecords) => {
                    for (let i = 0; i < mutationRecords.length; i++) {
                        const currentMutation = mutationRecords[i];
                        for (let j = 0; j < currentMutation.addedNodes.length; j++) {
                            const addedNode = currentMutation.addedNodes[j];
                            if (addedNode.nodeType === Node.ELEMENT_NODE) {
                                const elementNode = addedNode;
                                const tagsRequiringSrc = ['IMG', 'SCRIPT', 'IFRAME', 'AUDIO', 'VIDEO', 'SOURCE', 'EMBED', 'OBJECT'];
                                
                                if (tagsRequiringSrc.includes(elementNode.tagName) && elementNode.src) {
                                    const rewrittenSrc = resolveToAbsoluteProxyUrl(elementNode.src);
                                    if (elementNode.src !== rewrittenSrc) {
                                        elementNode.src = rewrittenSrc;
                                    }
                                }
                                
                                if ((elementNode.tagName === 'A' || elementNode.tagName === 'LINK') && elementNode.href) {
                                    const rewrittenHref = resolveToAbsoluteProxyUrl(elementNode.href);
                                    if (elementNode.href !== rewrittenHref) {
                                        elementNode.href = rewrittenHref;
                                    }
                                }
                                
                                const descendantNodes = elementNode.querySelectorAll ? elementNode.querySelectorAll('[src], [href]') : [];
                                for (let k = 0; k < descendantNodes.length; k++) {
                                    const childNode = descendantNodes[k];
                                    if (childNode.src) {
                                        const rewrittenChildSrc = resolveToAbsoluteProxyUrl(childNode.src);
                                        if (childNode.src !== rewrittenChildSrc) {
                                            childNode.src = rewrittenChildSrc;
                                        }
                                    } else if (childNode.href) {
                                        const rewrittenChildHref = resolveToAbsoluteProxyUrl(childNode.href);
                                        if (childNode.href !== rewrittenChildHref) {
                                            childNode.href = rewrittenChildHref;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                
                dynamicDomObserver.observe(document.documentElement || document.body, {
                    childList: true,
                    subtree: true
                });

                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [CLICK_INTERCEPTOR]
                window.addEventListener('click', function(clickEvent) {
                    const closestAnchor = clickEvent.target.closest('a');
                    if (closestAnchor && closestAnchor.href) {
                        const rawHrefAttr = closestAnchor.getAttribute('href');
                        if (!rawHrefAttr || rawHrefAttr.startsWith('javascript:') || rawHrefAttr.startsWith('#') || rawHrefAttr.startsWith('mailto:')) {
                            return;
                        }
                        
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                        
                        const bridgedDestination = resolveToAbsoluteProxyUrl(closestAnchor.href);
                        
                        // Notify parent UI for address bar sync
                        try {
                            window.parent.postMessage({ 
                                instruction: 'tbrowser-runtime-navigation',
                                targetUrl: closestAnchor.href
                            }, '*');
                        } catch(e) {}

                        window.location.href = bridgedDestination;
                    }
                }, true);
                
                // IMPLEMENTATION TRACKING: [INJECTED_RUNTIME] - [TELEMETRY_DISPATCH]
                window.addEventListener('load', () => {
                    try {
                        window.parent.postMessage({ instruction: 'tbrowser-runtime-loaded' }, '*');
                    } catch(e) {}
                });
            })();
        </script>
        `;
    }
}

// IMPLEMENTATION TRACKING: [NETWORK_CORE] - [HTML_STREAM_ASSEMBLER]
class HTMLStreamAssemblyLayer {
    
    // IMPLEMENTATION TRACKING: [NETWORK_CORE] - [DECOMPRESSION_AND_BUFFERING]
    public static executeAssemblyAndInjection(
        upstreamResponse: http.IncomingMessage, 
        clientResponse: http.ServerResponse, 
        activeProxyPort: number, 
        currentActiveOrigin: string
    ): void {
        let readableStream: NodeJS.ReadableStream = upstreamResponse;
        const contentEncodingHeader = upstreamResponse.headers['content-encoding'] || '';

        // Safely map native node zlib streams based on server encoding
        if (contentEncodingHeader.includes('gzip')) {
            readableStream = upstreamResponse.pipe(zlib.createGunzip());
        } else if (contentEncodingHeader.includes('deflate')) {
            readableStream = upstreamResponse.pipe(zlib.createInflate());
        } else if (contentEncodingHeader.includes('br')) {
            readableStream = upstreamResponse.pipe(zlib.createBrotliDecompress());
        }

        const bufferArray: Buffer[] = [];
        
        readableStream.on('data', (dataChunk: Buffer) => {
            bufferArray.push(dataChunk);
        });
        
        readableStream.on('end', () => {
            try {
                // IMPLEMENTATION TRACKING: [NETWORK_CORE] - [CONCATENATION_AND_REWRITE]
                const unifiedBuffer = Buffer.concat(bufferArray);
                let stringifiedPayload = unifiedBuffer.toString('utf8');
                
                stringifiedPayload = HTMLStreamAssemblyLayer.executeGlobalRegexReplacement(stringifiedPayload, activeProxyPort, currentActiveOrigin);
                
                const clientRuntimeScript = JavascriptRuntimeInjector.constructInjectionPayload(activeProxyPort, currentActiveOrigin);
                
                if (stringifiedPayload.includes('<head>')) {
                    stringifiedPayload = stringifiedPayload.replace('<head>', '<head>\n' + clientRuntimeScript);
                } else if (stringifiedPayload.includes('<html>')) {
                    stringifiedPayload = stringifiedPayload.replace('<html>', '<html>\n' + clientRuntimeScript);
                } else {
                    stringifiedPayload = clientRuntimeScript + '\n' + stringifiedPayload;
                }

                clientResponse.end(stringifiedPayload);
            } catch (assemblyError) {
                console.error('[T Browser] Critical Stream Assembly Failure:', assemblyError);
                clientResponse.end();
            }
        });

        readableStream.on('error', (streamError: Error) => {
            console.error('[T Browser] Upstream Readable Stream Error:', streamError);
            clientResponse.end();
        });
    }

    // IMPLEMENTATION TRACKING: [NETWORK_CORE] - [REGEX_DOM_REWRITE]
    private static executeGlobalRegexReplacement(htmlPayload: string, port: number, origin: string): string {
        // Rewrite all absolute HTTP/HTTPS links
        let processedHtml = htmlPayload.replace(/(href|src|action)\s*=\s*(["'])(https?:\/\/[^"']+)\2/gi, (matchRegex, attributeType, quotationMark, targetUrl) => {
            return `${attributeType}=${quotationMark}http://127.0.0.1:${port}${PROXY_ROUTE_PREFIX}${encodeURIComponent(targetUrl)}${quotationMark}`;
        });
        
        // Rewrite root-relative links ensuring they are forced through absolute bridge
        processedHtml = processedHtml.replace(/(href|src|action)\s*=\s*(["'])\/([^"']+)\2/gi, (matchRegex, attributeType, quotationMark, relativePath) => {
            if (relativePath.startsWith('/')) { return matchRegex; }
            const constructedAbsoluteUrl = origin + '/' + relativePath;
            return `${attributeType}=${quotationMark}http://127.0.0.1:${port}${PROXY_ROUTE_PREFIX}${encodeURIComponent(constructedAbsoluteUrl)}${quotationMark}`;
        });

        return processedHtml;
    }
}

// IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [ENTERPRISE_PROXY_ENGINE]
class EnterpriseVirtualizationEngine {
    private internalServer: http.Server | null = null;
    private assignedPort: number = 0;
    private trackedActiveOrigin: string = '';
    private globalCookieStore: EnterpriseCookieJar;

    constructor() {
        this.globalCookieStore = new EnterpriseCookieJar();
    }

    // IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [ENGINE_BOOTSTRAP]
    public bootEngine(): Promise<number> {
        return new Promise((resolveEnginePromise, rejectEnginePromise) => {
            this.internalServer = http.createServer((incomingClientReq, outgoingClientRes) => {
                this.routeIncomingTraffic(incomingClientReq, outgoingClientRes);
            });
            
            this.internalServer.on('clientError', (clientError, networkSocket) => {
                console.error('[T Browser Virtualization] Socket Exception:', clientError);
                networkSocket.end('HTTP/1.1 400 Bad Request\\r\\n\\r\\n');
            });

            this.internalServer.listen(0, '127.0.0.1', () => {
                const serverAddressConfig = this.internalServer?.address();
                if (serverAddressConfig && typeof serverAddressConfig === 'object') {
                    this.assignedPort = serverAddressConfig.port;
                    console.log(`[T Browser Virtualization] Active Engine Bound to Port: ${this.assignedPort}`);
                    resolveEnginePromise(this.assignedPort);
                } else {
                    rejectEnginePromise(new Error('Virtualization Engine failed to resolve port bindings.'));
                }
            });
        });
    }

    public shutdownEngine(): void {
        if (this.internalServer) {
            this.internalServer.close();
            this.internalServer = null;
        }
    }

    // IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [TRAFFIC_ROUTER]
    private routeIncomingTraffic(incomingClientReq: http.IncomingMessage, outgoingClientRes: http.ServerResponse): void {
        try {
            let finalTargetUrlString = '';

            // IMPLEMENTATION TRACKING: [ROUTING_LOGIC] - [REFERER_MAPPING_ENGINE_FOR_SPA]
            if (incomingClientReq.url && incomingClientReq.url.startsWith(PROXY_ROUTE_PREFIX)) {
                const encodedTargetSubstring = incomingClientReq.url.substring(PROXY_ROUTE_PREFIX.length);
                finalTargetUrlString = decodeURIComponent(encodedTargetSubstring);
                try {
                    this.trackedActiveOrigin = new URL(finalTargetUrlString).origin;
                } catch (originParseError) {
                    // Suppress and fallback gracefully
                }
            } else {
                const requestReferer = incomingClientReq.headers.referer;
                if (requestReferer && requestReferer.includes(PROXY_ROUTE_PREFIX)) {
                    const splitRefererArray = requestReferer.split(PROXY_ROUTE_PREFIX);
                    if (splitRefererArray.length > 1) {
                        const decodedOriginalRefererUrl = decodeURIComponent(splitRefererArray[1]);
                        try {
                            const refererOriginObject = new URL(decodedOriginalRefererUrl);
                            finalTargetUrlString = refererOriginObject.origin + (incomingClientReq.url || '/');
                        } catch (refererOriginError) {
                            finalTargetUrlString = this.trackedActiveOrigin + (incomingClientReq.url || '/');
                        }
                    } else {
                        finalTargetUrlString = this.trackedActiveOrigin + (incomingClientReq.url || '/');
                    }
                } else {
                    if (!this.trackedActiveOrigin) {
                        return this.renderFallbackErrorView(outgoingClientRes, 'Implicit routing failed: No active tracking origin available to resolve SPA relative path.');
                    }
                    finalTargetUrlString = this.trackedActiveOrigin + (incomingClientReq.url || '/');
                }
            }

            let validatedTargetUrlObject: URL;
            try {
                validatedTargetUrlObject = new URL(finalTargetUrlString);
            } catch (urlValidationError) {
                return this.renderFallbackErrorView(outgoingClientRes, `Fatal URL Mapping Exception: ${finalTargetUrlString}`);
            }

            // IMPLEMENTATION TRACKING: [ROUTING_LOGIC] - [DEEP_QUERY_REDIRECT_INTERCEPTION]
            if (validatedTargetUrlObject.hostname.includes('google') && validatedTargetUrlObject.pathname === '/url') {
                const embeddedGoogleTarget = validatedTargetUrlObject.searchParams.get('url') || validatedTargetUrlObject.searchParams.get('q');
                if (embeddedGoogleTarget) {
                    outgoingClientRes.writeHead(302, { 'location': `${PROXY_ROUTE_PREFIX}${encodeURIComponent(embeddedGoogleTarget)}` });
                    outgoingClientRes.end();
                    return; // STRICT COMPLIANCE: Split void return execution
                }
            }

            this.dispatchUpstreamNetworkRequest(validatedTargetUrlObject, incomingClientReq, outgoingClientRes);

        } catch (fatalPipelineError: unknown) {
            console.error('[T Browser Virtualization] Fatal Pipeline Error:', fatalPipelineError);
            if (fatalPipelineError instanceof Error) {
                this.renderFallbackErrorView(outgoingClientRes, fatalPipelineError.message);
            } else {
                this.renderFallbackErrorView(outgoingClientRes, 'An unknown fatal error crashed the proxy pipeline.');
            }
        }
    }

    // IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [UPSTREAM_DISPATCHER]
    private dispatchUpstreamNetworkRequest(targetUrlObject: URL, incomingClientReq: http.IncomingMessage, outgoingClientRes: http.ServerResponse): void {
        const upstreamRequestOptions: https.RequestOptions = {
            hostname: targetUrlObject.hostname,
            port: targetUrlObject.port || (targetUrlObject.protocol === 'https:' ? 443 : 80),
            path: targetUrlObject.pathname + targetUrlObject.search,
            method: incomingClientReq.method,
            headers: {
                ...incomingClientReq.headers,
                host: targetUrlObject.host,
            }
        };

        // IMPLEMENTATION TRACKING: [UPSTREAM_DISPATCHER] - [STRICT_TYPE_HEADER_VIRTUALIZATION]
        if (!upstreamRequestOptions.headers) {
            upstreamRequestOptions.headers = {};
        }
        
        // Create a strictly-typed alias pointer to allow secure element indexing
        const activeHeaders = upstreamRequestOptions.headers as Record<string, any>;

        delete activeHeaders['host'];
        activeHeaders['host'] = targetUrlObject.host;
        activeHeaders['user-agent'] = CORPORATE_USER_AGENT;
        activeHeaders['sec-ch-ua'] = SEC_CH_UA_HEADER;
        activeHeaders['sec-ch-ua-mobile'] = '?0';
        activeHeaders['sec-ch-ua-platform'] = '"Windows"';
        activeHeaders['sec-fetch-dest'] = incomingClientReq.headers['sec-fetch-dest'] || 'document';
        activeHeaders['sec-fetch-mode'] = incomingClientReq.headers['sec-fetch-mode'] || 'navigate';
        activeHeaders['sec-fetch-site'] = 'cross-site';
        activeHeaders['sec-fetch-user'] = '?1';
        activeHeaders['upgrade-insecure-requests'] = '1';
        activeHeaders['connection'] = 'keep-alive';
        
        activeHeaders['accept'] = incomingClientReq.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        activeHeaders['accept-language'] = incomingClientReq.headers['accept-language'] || 'en-US,en;q=0.9';
        activeHeaders['accept-encoding'] = 'gzip, deflate, br';

        if (activeHeaders['origin']) {
            activeHeaders['origin'] = targetUrlObject.origin;
        }
        activeHeaders['referer'] = targetUrlObject.origin + '/';

        // IMPLEMENTATION TRACKING: [UPSTREAM_DISPATCHER] - [COOKIE_INJECTION]
        const statefulSessionCookies = this.globalCookieStore.serializeCookiesForRequest(targetUrlObject.hostname);
        if (statefulSessionCookies !== '') {
            if (activeHeaders['cookie']) {
                activeHeaders['cookie'] = activeHeaders['cookie'] + '; ' + statefulSessionCookies;
            } else {
                activeHeaders['cookie'] = statefulSessionCookies;
            }
        }

        const networkModule = targetUrlObject.protocol === 'https:' ? https : http;
        
        if (targetUrlObject.protocol === 'https:') {
            upstreamRequestOptions.rejectUnauthorized = false;
            upstreamRequestOptions.servername = targetUrlObject.hostname;
        }
        
        const dispatchedProxyRequest = networkModule.request(upstreamRequestOptions, (upstreamResponse) => {
            this.handleUpstreamNetworkResponse(targetUrlObject, upstreamResponse, outgoingClientRes);
        });

        dispatchedProxyRequest.on('error', (upstreamNetworkError) => {
            console.error('[T Browser Virtualization] Dispatched Upstream Request Failed:', upstreamNetworkError);
            this.renderFallbackErrorView(outgoingClientRes, `Upstream Target Unreachable: ${upstreamNetworkError.message}`);
        });

        if (incomingClientReq.method === 'POST' || incomingClientReq.method === 'PUT' || incomingClientReq.method === 'PATCH') {
            incomingClientReq.pipe(dispatchedProxyRequest);
        } else {
            dispatchedProxyRequest.end();
        }
    }

    // IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [UPSTREAM_RESPONSE_HANDLER]
    private handleUpstreamNetworkResponse(targetUrlObject: URL, upstreamResponse: http.IncomingMessage, outgoingClientRes: http.ServerResponse): void {
        // Strict cast to maintain index signatures correctly
        const cleanResponseHeaders = { ...upstreamResponse.headers } as Record<string, any>;

        // IMPLEMENTATION TRACKING: [UPSTREAM_RESPONSE_HANDLER] - [COOKIE_EXTRACTION_AND_CLEANSING]
        if (cleanResponseHeaders['set-cookie']) {
            this.globalCookieStore.ingestCookiesFromResponse(targetUrlObject.hostname, cleanResponseHeaders['set-cookie']);
            
            let arrayCookies = cleanResponseHeaders['set-cookie'];
            if (!Array.isArray(arrayCookies)) { 
                arrayCookies = [arrayCookies]; 
            }
            cleanResponseHeaders['set-cookie'] = arrayCookies.map((cookieString: string) => {
                return cookieString.replace(/Domain=[^;]+/ig, '')
                                   .replace(/Secure/ig, '')
                                   .replace(/SameSite=[^;]+/ig, 'SameSite=Lax');
            });
        }

        // IMPLEMENTATION TRACKING: [UPSTREAM_RESPONSE_HANDLER] - [FRAME_SECURITY_STRIPPING]
        delete cleanResponseHeaders['x-frame-options'];
        delete cleanResponseHeaders['content-security-policy'];
        delete cleanResponseHeaders['content-security-policy-report-only'];
        delete cleanResponseHeaders['cross-origin-opener-policy'];
        delete cleanResponseHeaders['cross-origin-embedder-policy'];
        delete cleanResponseHeaders['cross-origin-resource-policy'];
        delete cleanResponseHeaders['strict-transport-security'];
        delete cleanResponseHeaders['x-xss-protection'];

        cleanResponseHeaders['access-control-allow-origin'] = '*';
        cleanResponseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        cleanResponseHeaders['access-control-allow-headers'] = '*';

        // IMPLEMENTATION TRACKING: [UPSTREAM_RESPONSE_HANDLER] - [ROUTING_REDIRECT_FIX]
        if (cleanResponseHeaders['location']) {
            let redirectLocation = cleanResponseHeaders['location'];
            if (redirectLocation.startsWith('/')) {
                redirectLocation = this.trackedActiveOrigin + redirectLocation;
            } else if (!redirectLocation.startsWith('http')) {
                redirectLocation = this.trackedActiveOrigin + '/' + redirectLocation;
            }
            cleanResponseHeaders['location'] = `${PROXY_ROUTE_PREFIX}${encodeURIComponent(redirectLocation)}`;
        }

        const resolvedContentType = cleanResponseHeaders['content-type'] || '';
        const responseIsHtmlDocument = resolvedContentType.toLowerCase().includes('text/html');

        // IMPLEMENTATION TRACKING: [UPSTREAM_RESPONSE_HANDLER] - [DOCUMENT_TYPE_SWITCH]
        if (responseIsHtmlDocument) {
            delete cleanResponseHeaders['content-length'];
            delete cleanResponseHeaders['content-encoding'];
            
            outgoingClientRes.writeHead(upstreamResponse.statusCode || 200, cleanResponseHeaders);
            
            HTMLStreamAssemblyLayer.executeAssemblyAndInjection(
                upstreamResponse, 
                outgoingClientRes, 
                this.assignedPort, 
                this.trackedActiveOrigin
            );
        } else {
            outgoingClientRes.writeHead(upstreamResponse.statusCode || 200, cleanResponseHeaders);
            upstreamResponse.pipe(outgoingClientRes);
        }
    }

    // IMPLEMENTATION TRACKING: [SERVER_ARCHITECTURE] - [FALLBACK_ERROR_RENDERER]
    private renderFallbackErrorView(outgoingClientRes: http.ServerResponse, errorReason: string): void {
        if (outgoingClientRes.headersSent) { return; }
        
        console.warn(`[T Browser Virtualization] Engaging Fallback Render. Reason: ${errorReason}`);
        outgoingClientRes.writeHead(200, { 'Content-Type': 'text/html' });
        
        const fallbackHtmlPayload = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Proxy Execution Disruption</title>
                <style>
                    body { margin: 0; background: #1e1e1e; color: #d4d4d4; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
                    .error-panel { background: #252526; padding: 36px; border-radius: 8px; border: 1px solid #3c3c3c; text-align: center; max-width: 550px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    .error-title { color: #f48771; font-weight: 600; font-size: 20px; margin-top: 0; }
                    .error-description { color: #a0a0a0; font-size: 14px; line-height: 1.5; margin-bottom: 24px; word-break: break-word; }
                    .error-action-btn { margin-top: 15px; padding: 10px 24px; background: #007fd4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
                    .error-action-btn:hover { background: #006eb3; }
                </style>
            </head>
            <body>
                <div class="error-panel">
                    <h2 class="error-title">Network Request Disrupted</h2>
                    <p class="error-description">${errorReason}</p>
                    <button class="error-action-btn" onclick="window.history.back()">Return to Previous Page</button>
                </div>
            </body>
            </html>
        `;
        outgoingClientRes.end(fallbackHtmlPayload);
    }
}

// IMPLEMENTATION TRACKING: [VSCODE_EXTENSION] - [LIFECYCLE_ORCHESTRATOR]
export class TBrowserWorkspaceExtension {
    private static activeProxyEngine: EnterpriseVirtualizationEngine | null = null;

    // IMPLEMENTATION TRACKING: [VSCODE_EXTENSION] - [ACTIVATION_ROUTINE]
    public static async triggerActivation(vscodeContext: vscode.ExtensionContext): Promise<void> {
        try {
            this.activeProxyEngine = new EnterpriseVirtualizationEngine();
            const boundEnginePort = await this.activeProxyEngine.bootEngine();

            const workspaceOpenCommand = vscode.commands.registerCommand('t-browser.open', () => {
                this.instantiateWebviewPanel(vscodeContext, boundEnginePort);
            });

            vscodeContext.subscriptions.push(workspaceOpenCommand);
        } catch (activationFatalError) {
            console.error('Failed to trigger T Browser Enterprise Activation:', activationFatalError);
            vscode.window.showErrorMessage('T Browser failed to initialize its virtualization proxy engine.');
        }
    }

    // IMPLEMENTATION TRACKING: [VSCODE_EXTENSION] - [DEACTIVATION_ROUTINE]
    public static triggerDeactivation(): void {
        if (this.activeProxyEngine) {
            this.activeProxyEngine.shutdownEngine();
            this.activeProxyEngine = null;
        }
    }

    // IMPLEMENTATION TRACKING: [VSCODE_EXTENSION] - [WEBVIEW_INSTANTIATION]
    private static instantiateWebviewPanel(vscodeContext: vscode.ExtensionContext, enginePort: number): void {
        const vscodeWebviewPanel = vscode.window.createWebviewPanel(
            'tBrowserEnterpriseEdition',
            'T Browser',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.file(vscodeContext.extensionPath)]
            }
        );

        const absoluteUiLayoutPath = path.join(vscodeContext.extensionPath, 'ui.html');
        try {
            let rawHtmlTemplateContent = fs.readFileSync(absoluteUiLayoutPath, 'utf8');
            rawHtmlTemplateContent = rawHtmlTemplateContent.replace('{{PROXY_PORT}}', enginePort.toString());
            vscodeWebviewPanel.webview.html = rawHtmlTemplateContent;
        } catch (templateReadError) {
            vscodeWebviewPanel.webview.html = `
                <div style="padding: 20px; font-family: sans-serif; color: white; background: #1e1e1e; height: 100vh;">
                    <h1 style="color: #f48771;">Layout Resolution Failure</h1>
                    <p>Failed to load the primary <code>ui.html</code> layout from disk.</p>
                    <pre style="background: #000; padding: 10px;">${templateReadError}</pre>
                </div>
            `;
        }
    }
}

// IMPLEMENTATION TRACKING: [VSCODE_EXTENSION] - [EXTENSION_EXPORTS]
export function activate(context: vscode.ExtensionContext) {
    TBrowserWorkspaceExtension.triggerActivation(context);
}

export function deactivate() {
    TBrowserWorkspaceExtension.triggerDeactivation();
}
