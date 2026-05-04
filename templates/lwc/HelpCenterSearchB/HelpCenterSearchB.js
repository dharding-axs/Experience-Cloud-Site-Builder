// Concept B: Search-to-Chat transformation with Knowledge-powered Tier 2 responses.
//
// REPLACE BEFORE DEPLOYING:
//   {{Prefix}}AgentChatController → your Apex controller class name
//   {{Prefix}}HelpCenterSearchB  → your LWC class name
//   {{prefix}}-                  → your CSS class prefix (e.g. acme-)
//
// CUSTOMER-SPECIFIC DATA (update all three sections below):
//   1. initialSuggestions — top-level topic pills (one per agent topic)
//   2. followUpPills      — per-topic follow-up pills
//   3. topicResponses     — simulated fallback responses per topic
//   4. followUpResponses  — per-pill detailed responses
//   5. detectTopic()      — keyword patterns to match user input to topics

import { LightningElement, track } from 'lwc';
import getAgentResponse from '@salesforce/apex/{{Prefix}}AgentChatController.getAgentResponse';

export default class {{Prefix}}HelpCenterSearchB extends LightningElement {
    @track searchTerm = '';
    @track chatActive = false;
    @track showSuggestions = true;
    @track isTyping = false;
    @track messages = [];
    @track activePills = [];

    messageCounter = 0;
    currentTopic = null;
    isAuthenticated = false;
    welcomeSent = false;
    @track loginPanelOpen = false;
    @track loginError = '';
    @track loginSubmitting = false;
    loginUsername = '';
    loginPassword = '';

    // ── CUSTOMER-SPECIFIC: replace with client agent topics ──────────────────
    initialSuggestions = [
        { id: 'i1', label: 'Topic 1', query: 'Tell me about topic 1', topic: 'topic1' },
        { id: 'i2', label: 'Topic 2', query: 'Tell me about topic 2', topic: 'topic2' },
        { id: 'i3', label: 'Topic 3', query: 'Tell me about topic 3', topic: 'topic3' },
        { id: 'i4', label: 'Topic 4', query: 'Tell me about topic 4', topic: 'topic4' },
        { id: 'i5', label: 'General help', query: 'I have a general question', topic: 'general' }
    ];

    // ── CUSTOMER-SPECIFIC: per-topic follow-up pills (3-4 per topic + "Something else") ──
    followUpPills = {
        topic1: [
            { id: 't1a', label: 'Sub-topic 1a', query: 'Tell me more about sub-topic 1a' },
            { id: 't1b', label: 'Sub-topic 1b', query: 'Tell me more about sub-topic 1b' },
            { id: 't1c', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        topic2: [
            { id: 't2a', label: 'Sub-topic 2a', query: 'Tell me more about sub-topic 2a' },
            { id: 't2b', label: 'Sub-topic 2b', query: 'Tell me more about sub-topic 2b' },
            { id: 't2c', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        topic3: [
            { id: 't3a', label: 'Sub-topic 3a', query: 'Tell me more about sub-topic 3a' },
            { id: 't3b', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        topic4: [
            { id: 't4a', label: 'Sub-topic 4a', query: 'Tell me more about sub-topic 4a' },
            { id: 't4b', label: 'Talk to a person', query: 'I need to speak with a human agent' }
        ],
        general: [
            { id: 'g1', label: 'Common policies', query: 'What are the key policies I should know?' },
            { id: 'g2', label: 'Talk to a person', query: 'I need to speak with a human agent' }
        ],
        switchTopic: [
            { id: 's1', label: 'Topic 1', query: 'Tell me about topic 1', topic: 'topic1' },
            { id: 's2', label: 'Topic 2', query: 'Tell me about topic 2', topic: 'topic2' },
            { id: 's3', label: 'Topic 3', query: 'Tell me about topic 3', topic: 'topic3' },
            { id: 's4', label: 'Topic 4', query: 'Tell me about topic 4', topic: 'topic4' }
        ]
    };

    // ── CUSTOMER-SPECIFIC: simulated fallback responses per topic ────────────
    topicResponses = {
        topic1: "Here's what I know about topic 1. Would you like more details?",
        topic2: "Here's what I know about topic 2. Can I help you further?",
        topic3: "Here's what I know about topic 3. What else would you like to know?",
        topic4: "Here's what I know about topic 4. How can I help?",
        general: "Good question! Let me look into that for you. Is there a specific topic you'd like to know more about?",
        switch: "Of course! What else can I help you with?"
    };

    // ── CUSTOMER-SPECIFIC: per-pill detailed responses ────────────────────────
    followUpResponses = {
        t1a: "Detailed response for sub-topic 1a.",
        t1b: "Detailed response for sub-topic 1b.",
        t2a: "Detailed response for sub-topic 2a.",
        t2b: "Detailed response for sub-topic 2b.",
        t3a: "Detailed response for sub-topic 3a.",
        t4a: "Detailed response for sub-topic 4a.",
        g1: "Key policies overview goes here."
    };
    // ─────────────────────────────────────────────────────────────────────────

    get sectionClass() {
        return this.chatActive ? '{{prefix}}-search-section {{prefix}}-search-chat-active' : '{{prefix}}-search-section';
    }

    get searchBoxClass() {
        return this.chatActive ? '{{prefix}}-search-box {{prefix}}-search-box-active' : '{{prefix}}-search-box';
    }

    get showSearchHeader() {
        return !this.chatActive;
    }

    get inputPlaceholder() {
        return this.chatActive ? 'Type a message...' : 'Ask me anything or log in for personalized help';
    }

    get suggestions() {
        return this.initialSuggestions;
    }

    get showContextPills() {
        return this.chatActive && this.activePills.length > 0 && !this.isTyping;
    }

    get chatBodyClass() {
        return this.loginPanelOpen ? '{{prefix}}-chat-body {{prefix}}-chat-body-split' : '{{prefix}}-chat-body';
    }

    get loginPanelClass() {
        return this.loginPanelOpen ? '{{prefix}}-login-panel {{prefix}}-login-panel-open' : '{{prefix}}-login-panel';
    }

    handleInput(event) {
        this.searchTerm = event.target.value;
        this.showSuggestions = !this.chatActive;
    }

    handleFocus() {
        if (!this.chatActive && this.searchTerm.length === 0) {
            this.showSuggestions = true;
        }
    }

    handleKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleSubmit();
        }
    }

    handleSubmit() {
        if (!this.searchTerm.trim()) return;

        this.activePills = [];

        if (this.chatActive) {
            this.currentTopic = this.detectTopic(this.searchTerm);
            const msg = this.searchTerm;
            this.addMessage(msg, 'user');
            this.searchTerm = '';
            this.fetchAgentResponse(msg, false);
        } else {
            this.currentTopic = this.detectTopic(this.searchTerm);
            this.openChat(this.searchTerm);
        }
    }

    handleSuggestionClick(event) {
        const query = event.currentTarget.dataset.query;
        const topic = event.currentTarget.dataset.topic;
        this.searchTerm = query;
        this.currentTopic = topic || null;
        this.openChat(query);
    }

    handlePillClick(event) {
        const query = event.currentTarget.dataset.query;
        const pillId = event.currentTarget.dataset.id;
        const topic = event.currentTarget.dataset.topic;

        this.activePills = [];

        if (topic === 'switch') {
            this.currentTopic = 'switch';
            this.addMessage(query, 'user');
            this.fetchAgentResponse(query, false);
            return;
        }

        if (topic) {
            this.currentTopic = topic;
        }

        this.addMessage(query, 'user');

        if (this.followUpResponses[pillId]) {
            this.simulateFollowUpResponse(pillId);
        } else {
            this.fetchAgentResponse(query, false);
        }
    }

    openChat(initialMessage) {
        this.chatActive = true;
        this.showSuggestions = false;
        this.searchTerm = '';
        this.activePills = [];

        if (!this.currentTopic) {
            this.currentTopic = this.detectTopic(initialMessage);
        }

        this.hideEmbeddedMessaging();

        if (!this.welcomeSent) {
            this.welcomeSent = true;
            this.addMessage(
                "Hello, I'm an AI assistant here to help you with any questions that you might have. How can I help you today?",
                'agent'
            );
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.addMessage(initialMessage, 'user');
                this.fetchAgentResponse(initialMessage, true);
            }, 600);
        } else {
            this.addMessage(initialMessage, 'user');
            this.fetchAgentResponse(initialMessage, false);
        }
    }

    handleCloseChat() {
        this.chatActive = false;
        this.messages = [];
        this.searchTerm = '';
        this.isTyping = false;
        this.showSuggestions = true;
        this.activePills = [];
        this.currentTopic = null;
        this.welcomeSent = false;
        this.isAuthenticated = false;
        this.loginPanelOpen = false;
        this.loginError = '';
        this.loginSubmitting = false;
        this.loginUsername = '';
        this.loginPassword = '';

        this.showEmbeddedMessaging();
    }

    handleInlinePillClick(event) {
        const action = event.currentTarget.dataset.action;
        const msgId = event.currentTarget.dataset.msgId;

        if (action === 'login') {
            this.removePillsFromMessage(msgId);
            this.addMessage('Account login', 'user');
            this.isTyping = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.isTyping = false;
                this.addMessage("Sure! Sign in on the right and I'll pull up your account details.", 'agent');
                this.loginPanelOpen = true;
            }, 800);
        }
    }

    handleLoginInput(event) {
        const field = event.target.dataset.field;
        if (field === 'username') {
            this.loginUsername = event.target.value;
        } else if (field === 'password') {
            this.loginPassword = event.target.value;
        }
        this.loginError = '';
    }

    handleLoginKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleLoginSubmit();
        }
    }

    handleLoginClose() {
        this.loginPanelOpen = false;
        this.loginError = '';
        this.loginUsername = '';
        this.loginPassword = '';
    }

    handleLoginSubmit() {
        if (!this.loginUsername.trim()) {
            this.loginError = 'Please enter your username.';
            return;
        }
        if (!this.loginPassword.trim()) {
            this.loginError = 'Please enter your password.';
            return;
        }

        this.loginSubmitting = true;
        this.loginError = '';
        const username = this.loginUsername;

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.loginSubmitting = false;
            this.isAuthenticated = true;
            this.loginPanelOpen = false;
            this.loginUsername = '';
            this.loginPassword = '';

            this.isTyping = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.isTyping = false;
                // CUSTOMER-SPECIFIC: update the welcome-back message with client-relevant account details
                this.addMessage(
                    "Welcome back, " + username + "! I've pulled up your account. How can I help you today?",
                    'agent'
                );
            }, 1200);
        }, 1500);
    }

    removePillsFromMessage(msgId) {
        this.messages = this.messages.map(msg => {
            if (msg.id === msgId) {
                return { ...msg, pills: [], hasPills: false };
            }
            return msg;
        });
    }

    addMessage(text, sender, pills) {
        this.messageCounter++;
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const isAgent = sender === 'agent';
        const messagePills = pills || [];

        this.messages = [...this.messages, {
            id: String(this.messageCounter),
            text: text,
            sender: sender,
            time: time,
            containerClass: `{{prefix}}-msg-row ${isAgent ? '{{prefix}}-msg-agent' : '{{prefix}}-msg-user'}`,
            bubbleClass: `{{prefix}}-msg-bubble ${isAgent ? '{{prefix}}-bubble-agent' : '{{prefix}}-bubble-user'}`,
            pills: messagePills,
            hasPills: messagePills.length > 0
        }];

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this.scrollToBottom(), 50);
    }

    // ── CUSTOMER-SPECIFIC: update keyword patterns to match client agent topics ──
    detectTopic(text) {
        if (!text) return 'general';
        const t = text.toLowerCase();
        if (t.includes('topic1') || t.includes('keyword1a') || t.includes('keyword1b')) return 'topic1';
        if (t.includes('topic2') || t.includes('keyword2a') || t.includes('keyword2b')) return 'topic2';
        if (t.includes('topic3') || t.includes('keyword3a')) return 'topic3';
        if (t.includes('topic4') || t.includes('keyword4a')) return 'topic4';
        if (t.includes('human') || t.includes('agent') || t.includes('person') || t.includes('speak')) return 'escalation';
        return 'general';
    }
    // ─────────────────────────────────────────────────────────────────────────

    async fetchAgentResponse(userMessage, appendLogin) {
        this.isTyping = true;
        const topic = this.currentTopic || this.detectTopic(userMessage);

        try {
            const result = await getAgentResponse({ userMessage: userMessage, topic: topic });

            this.isTyping = false;

            if (result.success === 'true' && result.response) {
                this.addMessage(result.response, 'agent');
            } else {
                this.addSimulatedResponse(userMessage);
            }
        } catch (e) {
            this.isTyping = false;
            this.addSimulatedResponse(userMessage);
        }

        if (appendLogin && !this.isAuthenticated) {
            const loginPills = [
                { id: 'login1', label: 'Account login', action: 'login' }
            ];
            this.addMessage(
                'To provide personalized assistance, please log in to your account.',
                'agent',
                loginPills
            );
        }

        this.activePills = this.followUpPills[topic] || this.followUpPills.general;
        this.currentTopic = null;
    }

    addSimulatedResponse(userMessage) {
        const topic = this.currentTopic || this.detectTopic(userMessage || this.getLastUserMessage());
        const response = this.topicResponses[topic] || this.topicResponses.general;
        this.addMessage(response, 'agent');
    }

    simulateFollowUpResponse(pillId) {
        this.isTyping = true;
        const delay = 1000 + Math.random() * 1200;

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.isTyping = false;
            this.addMessage(this.followUpResponses[pillId], 'agent');
            const topic = this.detectTopicFromPillId(pillId);
            this.activePills = this.followUpPills[topic] || this.followUpPills.general;
        }, delay);
    }

    detectTopicFromPillId(pillId) {
        if (pillId.startsWith('t1')) return 'topic1';
        if (pillId.startsWith('t2')) return 'topic2';
        if (pillId.startsWith('t3')) return 'topic3';
        if (pillId.startsWith('t4')) return 'topic4';
        return 'general';
    }

    getLastUserMessage() {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].sender === 'user') {
                return this.messages[i].text;
            }
        }
        return '';
    }

    scrollToBottom() {
        const container = this.template.querySelector('.{{prefix}}-chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    hideEmbeddedMessaging() {
        const el = document.querySelector('.embedded-messaging');
        if (el) {
            el.style.display = 'none';
        }
    }

    showEmbeddedMessaging() {
        const el = document.querySelector('.embedded-messaging');
        if (el) {
            el.style.display = '';
        }
    }
}
