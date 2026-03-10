importScripts('./messageProcessor.js');

let workerMessageProcessor = null;

function ensureWorkerMessageProcessor() {
    if (workerMessageProcessor) {
        return workerMessageProcessor;
    }
    if (self.messageProcessor && typeof self.messageProcessor.previewMessage === 'function') {
        workerMessageProcessor = self.messageProcessor;
        return workerMessageProcessor;
    }
    if (typeof self.MessageProcessor === 'function') {
        workerMessageProcessor = new self.MessageProcessor();
        self.messageProcessor = workerMessageProcessor;
        return workerMessageProcessor;
    }
    throw new Error('消息解析器不可用');
}

function buildWorkerErrorPayload(requestId, error) {
    return {
        type: 'preview-error',
        requestId,
        error: error && error.message ? error.message : '实时预览解析失败'
    };
}

self.addEventListener('message', (event) => {
    const payload = event && event.data && typeof event.data === 'object' ? event.data : {};
    const type = String(payload.type || '').trim();
    try {
        const processor = ensureWorkerMessageProcessor();
        if (type === 'sync-config') {
            if (typeof processor.setAttributeConfig === 'function') {
                processor.setAttributeConfig(payload.config || {
                    overrides: {},
                    hidden: [],
                    anchorAliases: {},
                    globalRules: {},
                    clientRules: {}
                });
            }
            self.postMessage({ type: 'sync-config-complete' });
            return;
        }
        if (type === 'preview') {
            const requestId = Number(payload.requestId);
            const result = processor.previewMessage(String(payload.message || ''), {
                clientId: String(payload.clientId || ''),
                allowPartial: payload.allowPartial !== false
            });
            self.postMessage({
                type: 'preview-result',
                requestId,
                result
            });
        }
    } catch (error) {
        if (type === 'preview') {
            self.postMessage(buildWorkerErrorPayload(Number(payload.requestId), error));
            return;
        }
        throw error;
    }
});

self.postMessage({ type: 'ready' });
