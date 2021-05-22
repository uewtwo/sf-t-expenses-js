chrome.webRequest.onHeadersReceived.addListener(function(details){
    console.log({details})
    let csp_headers = details.responseHeaders.filter(
        e => e.name.toLowerCase() !== "content-security-policy");
    // csp_headers.forEach((h) => h.value="");
    return {responseHeaders: csp_headers};
}, {urls: [
    "https://*.lightning.force.com/*",
    "https://*.visualforce.com/*"
]}, [
    "blocking", 
    "responseHeaders"
]);
