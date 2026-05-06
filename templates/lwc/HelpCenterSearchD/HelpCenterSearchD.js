import { LightningElement, track, api } from 'lwc';

const FAB_HIDE_CSS = `
.embeddedMessagingConversationButton,
[class*="embeddedMessagingConversationButton"],
[class*="ConversationButton"],
.embedded-messaging > button,
.embedded-messaging > div > button {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    position: fixed !important;
    left: -9999px !important;
    top: -9999px !important;
}
`;

const MIN_MS_AFTER_CLOSE = 1500;

export default class {{Prefix}}HelpCenterSearchD extends LightningElement {
    @track searchTerm = '';
    @track chatActive = false;
    @track contextPanelOpen = false;
    @track loginError = '';
    @track loginSubmitting = false;
    @api ecv2PagePath = '';

    _loginUsername = '';
    _loginPassword = '';
    _fabPolling = null;
    _hideObserver = null;
    _pollTimer = null;
    _frameObserver = null;
    _chatClosedAt = 0;

    connectedCallback() {
        this._clearEcv2Session();
        this._injectFabHideStyle();
        this._keepEcv2Hidden();
        this._startFabSuppression();
        this._startFabPolling();
    }

    renderedCallback() {
        this._injectFabHideStyle();
        if (!this.chatActive) this._suppressFab();
    }

    // ─── FAB / container hiding ───────────────────────────────────────────

    _injectFabHideStyle() {
        if (document.getElementById('{{prefix}}-fab-hide')) return;
        const style = document.createElement('style');
        style.id = '{{prefix}}-fab-hide';
        style.textContent = FAB_HIDE_CSS;
        document.head.appendChild(style);
    }

    _keepEcv2Hidden() {
        if (this._hideObserver) this._hideObserver.disconnect();
        const hide = () => {
            const ecv2 = document.querySelector('.embedded-messaging');
            if (ecv2 && !this.chatActive) {
                ecv2.style.setProperty('opacity', '0', 'important');
                ecv2.style.setProperty('pointer-events', 'none', 'important');
            }
        };
        hide();
        this._hideObserver = new MutationObserver(hide);
        this._hideObserver.observe(document.body, { childList: true, subtree: false });
    }

    _startFabPolling() {
        if (this._fabPolling) clearInterval(this._fabPolling);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._fabPolling = setInterval(() => this._suppressFab(), 200);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            if (this._fabPolling) { clearInterval(this._fabPolling); this._fabPolling = null; }
        }, 10000);
    }

    _startFabSuppression() {
        this._suppressFab();
        this._fabObserver = new MutationObserver(() => {
            this._injectFabHideStyle();
            this._suppressFab();
        });
        this._fabObserver.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['style', 'class']
        });
    }

    _suppressFab() {
        document.querySelectorAll(
            '.embeddedMessagingConversationButton, ' +
            '[class*="embeddedMessagingConversationButton"], ' +
            '[class*="ConversationButton"]'
        ).forEach(el => {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('left', '-9999px', 'important');
            el.style.setProperty('top', '-9999px', 'important');
        });
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) return;
        ecv2.querySelectorAll('button').forEach(btn => {
            if (!btn.closest('iframe') && !btn.closest('.embeddedMessagingFrame')) {
                btn.style.setProperty('display', 'none', 'important');
                btn.style.setProperty('visibility', 'hidden', 'important');
                btn.style.setProperty('opacity', '0', 'important');
            }
        });
    }

    // ─── Getters ──────────────────────────────────────────────────────────

    get sectionClass() {
        return this.chatActive ? 'swa-search-section swa-search-fullscreen' : 'swa-search-section';
    }

    get showSearchBox() {
        return !this.chatActive;
    }

    get chatBodyClass() {
        return 'swa-chat-body' + (this.contextPanelOpen ? ' swa-chat-body-split' : '');
    }

    get contextPanelClass() {
        return 'swa-context-panel' + (this.contextPanelOpen ? ' swa-context-panel-open' : '');
    }

    // ─── Search input ─────────────────────────────────────────────────────

    handleInput(event) {
        this.searchTerm = event.target.value;
    }

    handleKeyUp(event) {
        if (event.key === 'Enter') this.handleSubmit();
    }

    handleSubmit() {
        if (!this.searchTerm.trim()) return;

        const message = this.searchTerm.trim();
        this.chatActive = true;
        this.searchTerm = '';
        document.body.style.overflow = 'hidden';

        if (this._hideObserver) { this._hideObserver.disconnect(); this._hideObserver = null; }

        // How long since the last endChat? ECV2 needs ~1.5s to fully teardown
        // before launchChat() can start a clean new session.
        const msSinceClose = Date.now() - this._chatClosedAt;
        const delay = msSinceClose < MIN_MS_AFTER_CLOSE
            ? MIN_MS_AFTER_CLOSE - msSinceClose + 100
            : 100;

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this._openChat(message), delay);
    }

    // ─── Chat open ────────────────────────────────────────────────────────

    _openChat(message) {
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._openChat(message), 100);
            return;
        }

        // Hide the FAB immediately
        this._suppressFab();

        // launchChat() may replace the .embedded-messaging element entirely,
        // making any pre-launch reference stale. Hide it now as a best-effort,
        // then re-query fresh each poll tick to stay current.
        ecv2.style.setProperty('opacity', '0', 'important');
        ecv2.style.setProperty('pointer-events', 'none', 'important');

        this._launchChat();

        // Poll until iframe AND panel container are both in the DOM
        if (this._pollTimer) clearInterval(this._pollTimer);
        let attempts = 0;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._pollTimer = setInterval(() => {
            attempts++;
            if (attempts > 80) {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
                return;
            }
            // Re-query every tick — launchChat() may have replaced the element
            const currentEcv2 = document.querySelector('.embedded-messaging');
            if (!currentEcv2) return;
            currentEcv2.style.setProperty('opacity', '0', 'important');
            currentEcv2.style.setProperty('pointer-events', 'none', 'important');

            const iframe = currentEcv2.querySelector('iframe');
            const container = this.template.querySelector('.swa-ecv2-container');
            if (iframe && container) {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
                this._suppressFab();
                // Wait for ECV2's opening animation to finish writing its own
                // bottom-right coordinates before we override them.
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this._revealAndPosition(currentEcv2, message), 700);
            }
        }, 100);
    }

    _launchChat() {
        // eslint-disable-next-line no-undef
        const bootstrap = window.embeddedservice_bootstrap;
        if (bootstrap && bootstrap.utilAPI && typeof bootstrap.utilAPI.launchChat === 'function') {
            try {
                bootstrap.utilAPI.launchChat();
                return;
            } catch (e) { /* fall through to FAB click */ }
        }

        // FAB click fallback — temporarily restore button, click, re-hide
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) return;

        const fabHideStyle = document.getElementById('{{prefix}}-fab-hide');
        if (fabHideStyle) fabHideStyle.remove();

        let fab = ecv2.querySelector(
            '.embeddedMessagingConversationButton, [class*="ConversationButton"]'
        );
        if (!fab) {
            ecv2.querySelectorAll('button').forEach(btn => {
                if (!fab && !btn.closest('iframe') && !btn.closest('.embeddedMessagingFrame')) {
                    fab = btn;
                }
            });
        }
        if (fab) {
            fab.style.cssText = 'display:block !important; visibility:visible !important; ' +
                'width:48px !important; height:48px !important; opacity:1 !important; ' +
                'pointer-events:auto !important; position:fixed !important; ' +
                'bottom:20px !important; right:20px !important;';
            fab.click();
        }

        this._injectFabHideStyle();
        this._suppressFab();
    }

    _revealAndPosition(ecv2, message) {
        // Re-query in case launchChat() replaced the element since _openChat ran
        const liveEcv2 = document.querySelector('.embedded-messaging') || ecv2;
        this._suppressFab();
        this.positionEcv2InPanel();
        liveEcv2.style.removeProperty('opacity');
        liveEcv2.style.removeProperty('pointer-events');
        if (message) this._waitForInputReady(liveEcv2, message, 0);
    }

    // ─── Positioning ─────────────────────────────────────────────────────

    positionEcv2InPanel() {
        const container = this.template.querySelector('.swa-ecv2-container');
        if (!container) return;
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) return;

        this._suppressFab();

        const chatFrame = ecv2.querySelector(
            '.embeddedMessagingFrame, [class*="embeddedMessagingFrame"], iframe'
        );
        if (!chatFrame) return;

        const applyPosition = () => {
            const r = container.getBoundingClientRect();
            chatFrame.style.setProperty('position', 'fixed', 'important');
            chatFrame.style.setProperty('top', `${r.top}px`, 'important');
            chatFrame.style.setProperty('left', `${r.left}px`, 'important');
            chatFrame.style.setProperty('width', `${r.width}px`, 'important');
            chatFrame.style.setProperty('height', `${r.height}px`, 'important');
            chatFrame.style.setProperty('bottom', 'auto', 'important');
            chatFrame.style.setProperty('right', 'auto', 'important');
            chatFrame.style.setProperty('max-height', 'none', 'important');
            chatFrame.style.setProperty('border-radius', '0', 'important');
            chatFrame.style.setProperty('box-shadow', 'none', 'important');
            chatFrame.style.setProperty('z-index', '200001', 'important');
            chatFrame.style.setProperty('visibility', 'visible', 'important');
        };

        applyPosition();

        // ECV2 positions via CSS class changes (e.g. adds 'maximized' to the iframe),
        // not inline style writes. Watch 'class' so we re-apply whenever ECV2 transitions.
        // We must NOT watch 'style' — applyPosition writes inline styles, which would
        // trigger the observer again and create an infinite loop.
        if (this._frameObserver) this._frameObserver.disconnect();
        this._frameObserver = new MutationObserver(() => applyPosition());
        this._frameObserver.observe(chatFrame, { attributes: true, attributeFilter: ['class'] });
        this._frameObserver.observe(ecv2, { attributes: true, attributeFilter: ['class'] });

        this._hideEcv2Chrome(ecv2, 0);
        ecv2.style.visibility = 'visible';

        this._resizeHandler = () => this.updateEcv2Position();
        window.addEventListener('resize', this._resizeHandler, { passive: true });
    }

    updateEcv2Position() {
        const container = this.template.querySelector('.swa-ecv2-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) return;
        const chatFrame = ecv2.querySelector(
            '.embeddedMessagingFrame, [class*="embeddedMessagingFrame"], iframe'
        );
        if (chatFrame) {
            chatFrame.style.setProperty('top', `${rect.top}px`, 'important');
            chatFrame.style.setProperty('left', `${rect.left}px`, 'important');
            chatFrame.style.setProperty('width', `${rect.width}px`, 'important');
            chatFrame.style.setProperty('height', `${rect.height}px`, 'important');
        }
    }

    // ─── Message injection ────────────────────────────────────────────────

    _waitForInputReady(ecv2, message, attempt) {
        if (attempt >= 60) return;
        const iframe = ecv2.querySelector('iframe');
        if (!iframe) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._waitForInputReady(ecv2, message, attempt + 1), 500);
            return;
        }
        try {
            const iframeWin = iframe.contentWindow;
            const iframeDoc = iframe.contentDocument;
            if (!iframeDoc || !iframeWin) {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this._waitForInputReady(ecv2, message, attempt + 1), 500);
                return;
            }
            const textarea = iframeDoc.querySelector(
                'textarea, [class*="footerTextarea"], [contenteditable="true"]'
            );
            if (!textarea || textarea.disabled || textarea.readOnly ||
                    textarea.getAttribute('aria-disabled') === 'true') {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this._waitForInputReady(ecv2, message, attempt + 1), 500);
                return;
            }
            this._sendMessage(iframeWin, iframeDoc, textarea, message);
        } catch (e) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._waitForInputReady(ecv2, message, attempt + 1), 500);
        }
    }

    _sendMessage(iframeWin, iframeDoc, textarea, message) {
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                iframeWin.HTMLTextAreaElement.prototype, 'value'
            ).set;
            iframeWin.focus();
            textarea.focus();
            nativeSetter.call(textarea, message);
            textarea.dispatchEvent(new iframeWin.Event('input', { bubbles: true, composed: true }));
            textarea.dispatchEvent(new iframeWin.Event('change', { bubbles: true, composed: true }));
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._trySend(iframeDoc, iframeWin, textarea, message, 0), 400);
        } catch (e) { /* best-effort */ }
    }

    _trySend(iframeDoc, iframeWin, textarea, message, attempt) {
        if (attempt >= 15) return;

        ['keydown', 'keypress', 'keyup'].forEach(type => {
            textarea.dispatchEvent(new iframeWin.KeyboardEvent(type, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, composed: true, cancelable: true
            }));
        });

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            if (!textarea.value) return;
            const sendBtn = iframeDoc.querySelector(
                'button[class*="sendButton"], button[class*="send"], ' +
                'button[aria-label="Send"], button[title="Send"], button[type="submit"]'
            );
            if (sendBtn && !sendBtn.disabled) { sendBtn.click(); return; }
            const nativeSetter = Object.getOwnPropertyDescriptor(
                iframeWin.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(textarea, message);
            textarea.dispatchEvent(new iframeWin.Event('input', { bubbles: true, composed: true }));
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._trySend(iframeDoc, iframeWin, textarea, message, attempt + 1), 600);
        }, 400);
    }

    // ─── Chrome hiding ────────────────────────────────────────────────────

    _hideEcv2Chrome(ecv2, attempt) {
        const iframe = ecv2.querySelector('iframe');
        if (!iframe) {
            if (attempt < 15) {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
            }
            return;
        }
        try {
            const iframeDoc = iframe.contentDocument;
            if (!iframeDoc || !iframeDoc.head) {
                if (attempt < 15) {
                    // eslint-disable-next-line @lwc/lwc/no-async-operation
                    setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
                }
                return;
            }
            if (!iframeDoc.getElementById('{{prefix}}-ecv2-overrides')) {
                const style = iframeDoc.createElement('style');
                style.id = '{{prefix}}-ecv2-overrides';
                style.textContent = `
                    [class*="minimizedContainer"],
                    [class*="headerContainer"],
                    [class*="header_container"],
                    [class*="conversationHeader"],
                    [class*="Header"]:first-child,
                    header,
                    [class*="minimizeButton"],
                    [class*="closeButton"],
                    [class*="endChatButton"] {
                        display: none !important;
                        height: 0 !important;
                        overflow: hidden !important;
                    }
                `;
                iframeDoc.head.appendChild(style);
            }
        } catch (e) {
            if (attempt < 15) {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
            }
        }
    }

    // ─── Close ────────────────────────────────────────────────────────────

    handleCloseChat() {
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this._frameObserver) { this._frameObserver.disconnect(); this._frameObserver = null; }
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }

        // eslint-disable-next-line no-undef
        const bootstrap = window.embeddedservice_bootstrap;
        if (bootstrap && bootstrap.utilAPI && typeof bootstrap.utilAPI.endChat === 'function') {
            try { bootstrap.utilAPI.endChat(); } catch (e) { /* ignore */ }
        }

        // Record close time — next launchChat() must wait MIN_MS_AFTER_CLOSE
        this._chatClosedAt = Date.now();

        const ecv2 = document.querySelector('.embedded-messaging');
        if (ecv2) {
            ecv2.style.setProperty('opacity', '0', 'important');
            ecv2.style.setProperty('pointer-events', 'none', 'important');
        }

        this._clearEcv2Session();
        this._suppressFab();
        this._resetToSearchState();
        this._keepEcv2Hidden();
        this._startFabPolling();
    }

    // ─── Utilities ────────────────────────────────────────────────────────

    _clearEcv2Session() {
        try {
            [sessionStorage, localStorage].forEach(storage => {
                const keys = [];
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key) {
                        const k = key.toLowerCase();
                        if (k.includes('miaw') || k.includes('embeddedmessaging') ||
                            k.includes('esw_') || k.includes('messagingjwt') ||
                            k.includes('conversationid') || k.includes('messaging_')) {
                            keys.push(key);
                        }
                    }
                }
                keys.forEach(k => storage.removeItem(k));
            });
        } catch (e) { /* restricted */ }
    }

    _resetToSearchState() {
        document.body.style.overflow = '';
        this.chatActive = false;
        this.contextPanelOpen = false;
        this.searchTerm = '';
    }

    // ─── Context / login panel ────────────────────────────────────────────

    openContextPanel() {
        this.contextPanelOpen = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this.updateEcv2Position(), 50);
    }

    handleContextClose() {
        this.contextPanelOpen = false;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this.updateEcv2Position(), 50);
    }

    handleLoginInput(event) {
        const field = event.target.dataset.field;
        if (field === 'username') this._loginUsername = event.target.value;
        else if (field === 'password') this._loginPassword = event.target.value;
    }

    handleLoginKeyUp(event) {
        if (event.key === 'Enter') this.handleLoginSubmit();
    }

    handleLoginSubmit() {
        this.loginError = '';
        if (!this._loginUsername || !this._loginPassword) {
            this.loginError = 'Please enter both username and password.';
            return;
        }
        this.loginSubmitting = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.loginSubmitting = false;
            this.contextPanelOpen = false;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this.updateEcv2Position(), 50);
        }, 1500);
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────

    disconnectedCallback() {
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this._frameObserver) this._frameObserver.disconnect();
        if (this._fabObserver) this._fabObserver.disconnect();
        if (this._hideObserver) this._hideObserver.disconnect();
        if (this._fabPolling) clearInterval(this._fabPolling);
        if (this._pollTimer) clearInterval(this._pollTimer);
        const fabStyle = document.getElementById('{{prefix}}-fab-hide');
        if (fabStyle) fabStyle.remove();
        document.body.style.overflow = '';
    }
}
