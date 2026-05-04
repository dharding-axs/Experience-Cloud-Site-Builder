import { LightningElement, track } from 'lwc';
import getAgentResponse from '@salesforce/apex/{{Prefix}}AgentChatController.getAgentResponse';
import {{prefix}}Heart from '@salesforce/resourceUrl/{{prefix}}Heart';

export default class {{Prefix}}HelpCenterHeroC extends LightningElement {
    @track isFullscreenOpen = false;
    @track chatInput = '';
    @track isTyping = false;
    @track messages = [];
    @track activePills = [];

    heartUrl = {{prefix}}Heart;
    messageCounter = 0;
    currentTopic = null;
    isAuthenticated = false;
    welcomeSent = false;
    @track loginPanelOpen = false;
    @track loginError = '';
    @track loginSubmitting = false;
    loginUsername = '';
    loginPassword = '';

    initialSuggestions = [
        { id: 'i1', label: 'Book a flight', query: 'I want to book a flight from Dallas to Phoenix', topic: 'booking' },
        { id: 'i2', label: 'Check in', query: 'I need to check in for my flight tomorrow', topic: 'checkin' },
        { id: 'i3', label: 'Change my flight', query: 'I need to change my flight to a later time', topic: 'changes' },
        { id: 'i4', label: 'Baggage info', query: 'How many bags can I check for free?', topic: 'baggage' },
        { id: 'i5', label: 'Loyalty Program', query: 'How do I check my Loyalty Program points balance?', topic: 'rewards' },
        { id: 'i6', label: 'Flight delayed', query: 'My flight was canceled and I need to rebook', topic: 'disruptions' }
    ];

    followUpPills = {
        booking: [
            { id: 'b1', label: 'Compare fare types', query: 'What is the difference between Fare Type A, Fare Type B, and Fare Type C?' },
            { id: 'b2', label: 'EarlyBird Check-In', query: 'Should I add EarlyBird Check-In to my booking?' },
            { id: 'b3', label: 'Use Loyalty Program points', query: 'Can I use my Loyalty Program points to book?' },
            { id: 'b4', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        checkin: [
            { id: 'c1', label: 'Boarding position tips', query: 'How do I get a better boarding position?' },
            { id: 'c2', label: 'EarlyBird Check-In', query: 'What is EarlyBird Check-In and is it worth it?' },
            { id: 'c3', label: 'Mobile boarding pass', query: 'Can I use a mobile boarding pass?' },
            { id: 'c4', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        changes: [
            { id: 'ch1', label: 'Same-day change', query: 'How does same-day change work?' },
            { id: 'ch2', label: 'Same-day standby', query: 'Can I fly standby on an earlier flight?' },
            { id: 'ch3', label: 'Cancel and get refund', query: 'If I cancel, do I get a refund or travel funds?' },
            { id: 'ch4', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        baggage: [
            { id: 'bg1', label: 'Oversized items', query: 'What about oversized or overweight bags?' },
            { id: 'bg2', label: 'Carry-on rules', query: 'What counts as a personal item vs carry-on?' },
            { id: 'bg3', label: 'Track my bags', query: 'My bags are missing, how do I track them?' },
            { id: 'bg4', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        rewards: [
            { id: 'r1', label: 'Earning points', query: 'How do I earn Loyalty Program points faster?' },
            { id: 'r2', label: 'Companion Pass', query: 'How do I qualify for the Companion Pass?' },
            { id: 'r3', label: 'A-List status', query: 'What are the benefits of A-List and A-List Preferred?' },
            { id: 'r4', label: 'Something else', query: 'I have a different question', topic: 'switch' }
        ],
        disruptions: [
            { id: 'd1', label: 'Rebook my flight', query: 'What are my rebooking options?' },
            { id: 'd2', label: 'Get a refund', query: 'Can I get a refund instead of rebooking?' },
            { id: 'd3', label: 'Hotel or meal voucher', query: 'Does {{ClientName}} provide hotel or meal vouchers for delays?' },
            { id: 'd4', label: 'Talk to a person', query: 'I need to speak with a human agent' }
        ],
        general: [
            { id: 'g1', label: 'Travel policies', query: 'What are the key {{ClientName}} travel policies I should know?' },
            { id: 'g2', label: 'Unaccompanied minor', query: 'Does {{ClientName}} allow unaccompanied minors?' },
            { id: 'g3', label: 'Pet policy', query: 'Can I bring my pet on a {{ClientName}} flight?' },
            { id: 'g4', label: 'Talk to a person', query: 'I need to speak with a human agent' }
        ],
        switchTopic: [
            { id: 's1', label: 'Book a flight', query: 'I want to book a flight', topic: 'booking' },
            { id: 's2', label: 'Check in', query: 'Help me check in', topic: 'checkin' },
            { id: 's3', label: 'Change my flight', query: 'I need to change my flight', topic: 'changes' },
            { id: 's4', label: 'Baggage', query: 'I have a baggage question', topic: 'baggage' },
            { id: 's5', label: 'Loyalty Program', query: 'Tell me about Loyalty Program', topic: 'rewards' },
            { id: 's6', label: 'Flight disruption', query: 'My flight was disrupted', topic: 'disruptions' }
        ]
    };

    topicResponses = {
        booking: "I'd love to help you find a flight! {{ClientName}} has three fare types \u2014 Fare Type A (best value), Fare Type B (flexible), and Fare Type C (premium). Want me to help you figure out the best fare for your trip?",
        checkin: "Check-in opens exactly 24 hours before your flight \u2014 set a reminder so you can snag a great boarding position! Got your confirmation number handy?",
        changes: "No worries \u2014 {{ClientName}} never charges change fees! You can modify your itinerary anytime before departure. What change are you looking to make?",
        baggage: "Great news \u2014 {{ClientName}} lets you check two bags for free! Each bag can be up to 50 lbs and 62 inches. Plus you get one carry-on and one personal item. Anything else about baggage?",
        rewards: "Loyalty Program is a great program! You earn points on every flight and can redeem them for future travel. Are you curious about earning, redeeming, or your tier status?",
        disruptions: "I'm really sorry you're dealing with this \u2014 that's stressful. The good news is {{ClientName}} doesn't charge change fees, so we can look at getting you rebooked. Want me to walk through your options?",
        general: "Good question! Let me look into that for you. Is there a specific policy or topic you'd like to know more about?",
        switch: "Of course! What else can I help you with?"
    };

    followUpResponses = {
        b1: "Here's the breakdown:\n\n\u2022 Fare Type A \u2014 Best value. Non-refundable, but you get travel funds if you cancel.\n\u2022 Fare Type B \u2014 Fully refundable. More flexibility.\n\u2022 Fare Type C \u2014 Premium. Fully refundable, priority boarding (A1-15), extra points.",
        b2: "EarlyBird Check-In automatically checks you in before the 24-hour window \u2014 so you get a better boarding position without setting an alarm. It's $15-$25 per person per direction.",
        b3: "Absolutely! You can book with points on yourclient.com or the app. No blackout dates \u2014 if there's a seat, you can book it with points.",
        c1: "Check in exactly at the 24-hour mark \u2014 even seconds count! Or purchase EarlyBird Check-In. A-List members get priority boarding automatically.",
        c2: "EarlyBird Check-In is $15-$25 and automatically checks you in before general check-in opens. Handy for popular routes.",
        c3: "Yes! After checking in, your boarding pass is in the {{ClientName}} app. Just pull it up at the gate \u2014 no printing needed.",
        ch1: "Same-day change lets you switch to a different flight on the same day, same route. If the new flight costs more, you pay the difference.",
        ch2: "Same-day standby is free for all passengers! A-List members get priority on the standby list. Just ask at the gate.",
        ch3: "Fare Type A \u2014 travel funds (12 months). Fare Type B and Fare Type C \u2014 fully refundable to your original payment method.",
        bg1: "Bags over 50 lbs (up to 100 lbs) are $75 each way. Oversized bags (over 62 inches) are also $75. Over 100 lbs or 80 inches aren't accepted as checked luggage.",
        bg2: "Carry-on goes in the overhead bin (24\u00d716\u00d710\"). Personal item goes under the seat (18.5\u00d78.5\u00d713.5\"). Both are free!",
        bg3: "For delayed or missing bags, report at the baggage service office at your arrival airport or call 1-888-202-1024.",
        r1: "Fly often, use the Loyalty Program credit card, shop through the RR portal, and book hotel/car through {{ClientName}}. Fare Type C earns 12x points per dollar!",
        r2: "Earn 135,000 qualifying points in a calendar year. Your companion flies free for the rest of that year plus the next full year. Credit card sign-up bonuses count!",
        r3: "A-List: priority boarding, 25% point bonus, dedicated phone line. A-List Preferred: free WiFi, 100% point bonus, priority lane. Qualify with 35 or 70 one-way flights per year.",
        d1: "You can rebook for free on yourclient.com, the app, or by calling [CUSTOMER SERVICE NUMBER]. If nothing works that day, you can request a full refund.",
        d2: "Yes! If your flight is canceled or significantly delayed by {{ClientName}}, you're entitled to a full refund to your original payment method.",
        d3: "For overnight cancellations caused by {{ClientName}} (not weather), they may provide hotel and meal vouchers at the airport.",
        d4: "Absolutely \u2014 you can reach Customer Service at [CUSTOMER SERVICE NUMBER], or I can transfer you to a live agent right now.",
        g1: "Key policies: two free checked bags, no change fees, refundable fares available, points don't expire with activity every 24 months, free same-day standby.",
        g2: "{{ClientName}} doesn't offer an unaccompanied minor program \u2014 children under 12 must travel with someone at least 12. Young adults 12-17 can travel alone.",
        g3: "Small cats and dogs in-cabin for $125 each way. Must stay in an approved carrier under the seat. Only trained service dogs fly free.",
        g4: "Of course \u2014 you can call [CUSTOMER SERVICE NUMBER] or I can transfer you to a live agent right now."
    };

    get chatBodyClass() {
        return 'swa-fs-chat-body' + (this.loginPanelOpen ? ' swa-fs-chat-body-split' : '');
    }

    get loginPanelClass() {
        return 'swa-fs-login-panel' + (this.loginPanelOpen ? ' swa-fs-login-panel-open' : '');
    }

    get showContextPills() {
        return this.activePills.length > 0 && !this.isTyping;
    }

    get sendDisabled() {
        return !this.chatInput || !this.chatInput.trim();
    }

    openFullscreen() {
        this.isFullscreenOpen = true;
        this.hideEmbeddedMessaging();
        document.body.style.overflow = 'hidden';

        if (!this.welcomeSent) {
            this.welcomeSent = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.addMessage(
                    "Hello, I'm an AI assistant here to help you with any questions that you might have. How can I help you today?",
                    'agent'
                );
                this.activePills = this.initialSuggestions;
            }, 300);
        }
    }

    closeFullscreen() {
        this.isFullscreenOpen = false;
        this.messages = [];
        this.chatInput = '';
        this.isTyping = false;
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
        document.body.style.overflow = '';
    }

    handleChatInput(event) {
        this.chatInput = event.target.value;
    }

    handleChatKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleSendMessage();
        }
        if (event.key === 'Escape') {
            this.closeFullscreen();
        }
    }

    handleSendMessage() {
        if (!this.chatInput || !this.chatInput.trim()) return;
        this.activePills = [];
        this.currentTopic = this.detectTopic(this.chatInput);
        const msg = this.chatInput;
        this.addMessage(msg, 'user');
        this.chatInput = '';
        const isFirst = this.messages.filter(m => m.sender === 'user').length === 1;
        this.fetchAgentResponse(msg, isFirst);
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
            this.addMessage(query, 'user');
            this.fetchAgentResponse(query, this.messages.filter(m => m.sender === 'user').length === 1);
            return;
        }

        this.addMessage(query, 'user');

        if (this.followUpResponses[pillId]) {
            this.simulateFollowUpResponse(pillId);
        } else {
            this.fetchAgentResponse(query, false);
        }
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
                this.addMessage("Sure! Please sign in on the right and I'll pull up your account details.", 'agent');
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
            this.loginError = 'Please enter your username or Loyalty Program number.';
            return;
        }
        if (!this.loginPassword.trim()) {
            this.loginError = 'Please enter your password.';
            return;
        }

        this.loginSubmitting = true;
        this.loginError = '';

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.loginSubmitting = false;
            this.isAuthenticated = true;
            const savedUsername = this.loginUsername;
            this.loginPanelOpen = false;
            this.loginUsername = '';
            this.loginPassword = '';

            this.isTyping = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.isTyping = false;
                this.addMessage(
                    "Welcome back, " + savedUsername + "! I've pulled up your account. You have 42,380 Loyalty Program points and A-List status. How can I help you today?",
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
            containerClass: `swa-fs-msg-row ${isAgent ? 'swa-fs-msg-agent' : 'swa-fs-msg-user'}`,
            bubbleClass: `swa-fs-bubble ${isAgent ? 'swa-fs-bubble-agent' : 'swa-fs-bubble-user'}`,
            pills: messagePills,
            hasPills: messagePills.length > 0
        }];

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this.scrollToBottom(), 50);
    }

    detectTopic(text) {
        if (!text) return 'general';
        const t = text.toLowerCase();
        if (t.includes('book') || t.includes('flight from') || t.includes('flight to') || t.includes('fare')) return 'booking';
        if (t.includes('check in') || t.includes('check-in') || t.includes('checkin') || t.includes('boarding pass')) return 'checkin';
        if (t.includes('change') || t.includes('modify') || t.includes('reschedule') || t.includes('different time')) return 'changes';
        if (t.includes('bag') || t.includes('luggage') || t.includes('carryon') || t.includes('carry-on')) return 'baggage';
        if (t.includes('rapid rewards') || t.includes('points') || t.includes('companion pass') || t.includes('a-list') || t.includes('tier')) return 'rewards';
        if (t.includes('cancel') || t.includes('delay') || t.includes('disruption') || t.includes('rebook') || t.includes('weather')) return 'disruptions';
        return 'general';
    }

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
                'To provide personalized assistance and access to your booking details, please log in to your account.',
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
        if (pillId.startsWith('b')) return 'booking';
        if (pillId.startsWith('c')) return 'checkin';
        if (pillId.startsWith('ch')) return 'changes';
        if (pillId.startsWith('bg')) return 'baggage';
        if (pillId.startsWith('r')) return 'rewards';
        if (pillId.startsWith('d')) return 'disruptions';
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
        const container = this.template.querySelector('.swa-fs-messages');
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
