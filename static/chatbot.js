// ============================================
// CHATBOT WIDGET - DataDash Agent
// ============================================

// --- CONFIGURATION ---
// !!!!!! CHANGE URL!!!!!!
const AGENT_API_URL =
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://your-production-api-url.com';

// !!!!!! IMPORTANT !!!!!! APP NAME
const APP_NAME = "sales_a2a_agent";

class Chatbot {
    constructor() {
        this.isOpen = false;
        this.messageCount = 0;
        
        // Session State
        this.userId = null;
        this.sessionId = null;
        this.historyLoaded = false;
        this.sessionsList = [];
        this.isHistoryPanelOpen = false;

        // Question State
        this.allQuestions = [];
        this.showingAllQuestions = false; 
        
        // DOM Elements
        this.container = document.getElementById('chatbot-container');
        this.toggleBtn = document.getElementById('chatbot-toggle');
        this.window = document.getElementById('chatbot-window');
        this.messages = document.getElementById('chatbot-messages');
        this.input = document.getElementById('chatbot-input');
        this.sendBtn = document.getElementById('chatbot-send');
        this.minimizeBtn = document.getElementById('chatbot-minimize');
        this.resetBtn = document.getElementById('chatbot-reset');
        this.historyBtn = document.getElementById('chatbot-history');
        this.historyBackBtn = document.getElementById('history-back-btn');
        this.historyPanel = document.getElementById('chatbot-history-panel');
        this.historyList = document.getElementById('chatbot-history-list');
        this.quickActions = document.getElementById('chatbot-quick-actions'); 
        this.typingIndicator = document.getElementById('chatbot-typing');
        this.badge = this.toggleBtn.querySelector('.chatbot-badge');
        this.iconChat = this.toggleBtn.querySelector('.fab-icon-chat');
        this.iconClose = this.toggleBtn.querySelector('.fab-icon-close');
        this.sessionIdDisplay = document.getElementById('chatbot-session-id');
        this.sessionCopyBtn = document.getElementById('session-copy-btn');
        
        this.init();
    }

    async init() {
        if (!this.toggleBtn || !this.window) {
            console.error('Chatbot: Required elements not found');
            return;
        }

        // Load Questions from JSON
        await this.loadQuestions();

        // Event Listeners
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });
        
        this.minimizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });        

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showResetConfirmation();
            });
        }

        if (this.historyBtn) {
            this.historyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleHistoryPanel();
            });
        }

        if (this.historyBackBtn) {
            this.historyBackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeHistoryPanel();
            });
        }

        if (this.sessionCopyBtn) {
            this.sessionCopyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copySessionId();
            });
        }
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Click outside history panel
        document.addEventListener('click', (e) => {
            if (this.isHistoryPanelOpen && 
                !this.historyPanel.contains(e.target) && 
                !this.historyBtn.contains(e.target)) {
                this.closeHistoryPanel();
            }
        });

        // Initial welcome
        this.showWelcomeMessage();
        this.updateSessionDisplay();

        // Initial Quick Actions Render
        this.refreshQuickActions();

        // Notification badge demo
        setTimeout(() => {
            if (!this.isOpen && this.messageCount === 0) {
                this.showNotification();
            }
        }, 3000);

        console.log(`Chatbot initialized. Connected to: ${AGENT_API_URL}`);
    }

    // Question Management
    async loadQuestions() {
        try {
            const response = await fetch('/static/questions.json');
            if (!response.ok) throw new Error("Failed to load questions");
            this.allQuestions = await response.json();
        } catch (error) {
            console.error("Error loading questions.json:", error);
            // Fallback questions if file fails
            this.allQuestions = [
                "halo",
                "Top performing products"
            ];
        }
    }

    refreshQuickActions() {
        if (!this.quickActions || this.allQuestions.length === 0) return;

        this.quickActions.innerHTML = '';

        if (!this.showingAllQuestions) {
            
            // Shuffle and pick 2
            const shuffled = [...this.allQuestions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 2);

            // Render Questions
            selected.forEach(q => this.createQuestionBtn(q));

            // Render "View All" Button
            const moreBtn = document.createElement('button');
            moreBtn.className = 'quick-action-btn quick-action-nav';
            moreBtn.innerHTML = 'Sample Questions ⇲';
            moreBtn.onclick = (e) => {
                e.preventDefault();
                this.showingAllQuestions = true;
                this.refreshQuickActions();
            };
            this.quickActions.appendChild(moreBtn);

        } else {
            // Render All Questions
            const sortedQuestions = [...this.allQuestions].sort();
            sortedQuestions.forEach(q => this.createQuestionBtn(q));

            // Render "Back" Button
            const backBtn = document.createElement('button');
            backBtn.className = 'quick-action-btn quick-action-nav';
            backBtn.innerHTML = '← Back';
            
            backBtn.onclick = (e) => {
                e.preventDefault();
                this.showingAllQuestions = false;
                this.refreshQuickActions();
            };
            this.quickActions.appendChild(backBtn);
        }

        // Ensure it's visible
        this.quickActions.style.display = 'grid';
    }

    // Question Button
    createQuestionBtn(text) {
        const btn = document.createElement('button');
        btn.className = 'quick-action-btn';
        btn.textContent = text;
        
        // Populate input
        btn.addEventListener('click', () => {
            this.input.value = text;
            this.input.focus();
            // Optional: Reset view to default after selection?
            // this.showingAllQuestions = false; 
            // this.refreshQuickActions();
        });
        
        this.quickActions.appendChild(btn);
    }

    // Force new session (called on fresh login)
    async forceNewSession() {
        const email = this.getUserEmail();
        if (!email) {
            console.log('forceNewSession: No email yet, will create session when user opens chat');
            this.pendingNewSession = true;
            return;
        }

        this.userId = email;
        this.sessionId = `${this.userId}-${Math.floor(Date.now() / 1000)}`;
        this.historyLoaded = true;
        this.messageCount = 0;

        this.messages.innerHTML = '';
        this.showWelcomeMessage();

        // Show and Refresh Quick Actions
        this.refreshQuickActions();

        this.updateSessionDisplay();
        await this.initBackendSession();
        console.log('New session forced on login:', this.sessionId);
    }

    clearSessionData() {
        this.userId = null;
        this.sessionId = null;
        this.historyLoaded = false;
        this.messageCount = 0;
        this.sessionsList = [];
        this.pendingNewSession = false;

        this.messages.innerHTML = '';
        this.showWelcomeMessage();
        
        // Reset Quick Actions
        this.refreshQuickActions();

        this.updateSessionDisplay();
        
        if (this.isOpen) {
            this.toggle();
        }
        console.log('Chatbot session data cleared');
    }

    async toggleHistoryPanel() {
        if (this.isHistoryPanelOpen) {
            this.closeHistoryPanel();
        } else {
            await this.openHistoryPanel();
        }
    }

    async openHistoryPanel() {
        const email = this.getUserEmail();
        if (!email) {
            this.showToast('⚠️ Please sign in first');
            return;
        }

        this.userId = email;
        this.isHistoryPanelOpen = true;
        this.historyPanel.classList.add('show');
        this.historyBtn.classList.add('active');

        this.historyList.innerHTML = `
            <div class="history-loading">
                <div class="history-spinner"></div>
                <span>Loading sessions...</span>
            </div>
        `;

        try {
            await this.fetchSessionsList();
            this.renderSessionsList();
        } catch (error) {
            console.error('Error fetching sessions:', error);
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <span>⚠️</span>
                    <p>Failed to load sessions</p>
                </div>
            `;
        }
    }

    closeHistoryPanel() {
        this.isHistoryPanelOpen = false;
        this.historyPanel.classList.remove('show');
        this.historyBtn.classList.remove('active');
    }

    async fetchSessionsList() {
        const url = `/api/sessions?user_id=${encodeURIComponent(this.userId)}&app_name=${APP_NAME}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch sessions: ${response.status}`);
        }

        const sessions = await response.json();
        
        this.sessionsList = sessions.sort((a, b) => {
            const timeA = this.extractTimestamp(a.id);
            const timeB = this.extractTimestamp(b.id);
            return timeB - timeA;
        });

        return this.sessionsList;
    }

    extractTimestamp(sessionId) {
        const parts = sessionId.split('-');
        const timestamp = parseInt(parts[parts.length - 1]) || 0;
        return timestamp;
    }

    formatSessionDate(sessionId) {
        const timestamp = this.extractTimestamp(sessionId);
        if (!timestamp) return 'Unknown date';
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    renderSessionsList() {
        if (!this.sessionsList || this.sessionsList.length === 0) {
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <span>💬</span>
                    <p>No previous sessions</p>
                    <small>Start chatting to create your first session</small>
                </div>
            `;
            return;
        }

        let html = '';
        this.sessionsList.forEach((session, index) => {
            const isActive = session.id === this.sessionId;
            const formattedDate = this.formatSessionDate(session.id);
            const truncatedId = session.id.length > 25 
                ? session.id.substring(0, 12) + '...' + session.id.slice(-8)
                : session.id;

            html += `
                <div class="history-item ${isActive ? 'active' : ''}" 
                     data-session-id="${session.id}"
                     onclick="chatbot.loadSession('${session.id}')">
                    <div class="history-item-icon">
                        ${isActive ? '✓' : '💬'}
                    </div>
                    <div class="history-item-content">
                        <div class="history-item-title">
                            ${isActive ? 'Current Session' : `Session ${index + 1}`}
                        </div>
                        <div class="history-item-meta">
                            <span class="history-item-date">${formattedDate}</span>
                            <span class="history-item-id" title="${session.id}">${truncatedId}</span>
                        </div>
                    </div>
                    <div class="history-item-arrow">›</div>
                </div>
            `;
        });

        this.historyList.innerHTML = html;
    }

    async loadSession(sessionId) {
        if (sessionId === this.sessionId) {
            this.closeHistoryPanel();
            this.showToast('✓ Already viewing this session');
            return;
        }

        const email = this.getUserEmail();
        if (!email) {
            this.showToast('⚠️ Please sign in first');
            return;
        }

        this.userId = email;
        this.closeHistoryPanel();

        this.messages.innerHTML = `
            <div class="loading-session">
                <div class="loading-spinner-chat"></div>
                <p>Loading session...</p>
            </div>
        `;

        try {
            const url = `/api/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(this.userId)}&app_name=${APP_NAME}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load session: ${response.status}`);
            }

            const sessionData = await response.json();

            this.sessionId = sessionId;
            this.historyLoaded = true;
            this.updateSessionDisplay();

            this.messages.innerHTML = '';
            if (sessionData.events && sessionData.events.length > 0) {
                this.renderHistory(sessionData.events);
                // Even if history exists, we show fresh quick actions at the bottom
                this.refreshQuickActions();
            } else {
                this.showWelcomeMessage();
                this.refreshQuickActions();
            }

            this.showToast('✓ Session loaded');
            console.log('Loaded session:', sessionId);

        } catch (error) {
            console.error('Error loading session:', error);
            this.showWelcomeMessage();
            this.showToast('⚠️ Failed to load session');
        }
    }

    updateSessionDisplay() {
        if (this.sessionIdDisplay) {
            if (this.sessionId) {
                const displayId = this.sessionId.length > 30 
                    ? this.sessionId.substring(0, 15) + '...' + this.sessionId.slice(-10)
                    : this.sessionId;
                this.sessionIdDisplay.textContent = displayId;
                this.sessionIdDisplay.title = this.sessionId;
            } else {
                this.sessionIdDisplay.textContent = 'Not started';
                this.sessionIdDisplay.title = '';
            }
        }
    }

    copySessionId() {
        if (!this.sessionId) {
            this.showToast('⚠️ No active session');
            return;
        }

        navigator.clipboard.writeText(this.sessionId).then(() => {
            if (this.sessionCopyBtn) {
                this.sessionCopyBtn.textContent = '✓';
                this.sessionCopyBtn.classList.add('copied');
                setTimeout(() => {
                    this.sessionCopyBtn.textContent = '📋';
                    this.sessionCopyBtn.classList.remove('copied');
                }, 2000);
            }
            this.showToast('✓ Session ID copied!');
        }).catch(() => {
            this.showToast('⚠️ Failed to copy');
        });
    }

    showResetConfirmation() {
        const overlay = document.createElement('div');
        overlay.className = 'chatbot-modal-overlay';
        overlay.innerHTML = `
            <div class="chatbot-modal">
                <div class="chatbot-modal-icon">🔄</div>
                <h3>Start New Chat?</h3>
                <p>This will create a new session. Your current conversation history will be saved but won't appear in the new session.</p>
                <div class="chatbot-modal-actions">
                    <button class="chatbot-modal-btn cancel">Cancel</button>
                    <button class="chatbot-modal-btn confirm">New Chat</button>
                </div>
            </div>
        `;

        this.window.appendChild(overlay);

        const cancelBtn = overlay.querySelector('.cancel');
        const confirmBtn = overlay.querySelector('.confirm');

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            this.resetSession();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    async resetSession() {
        const email = this.getUserEmail();
        if (!email) {
            this.showToast('⚠️ Please sign in first');
            return;
        }

        this.userId = email;
        this.sessionId = `${this.userId}-${Math.floor(Date.now() / 1000)}`;
        this.historyLoaded = false;
        this.messageCount = 0;

        this.messages.innerHTML = '';
        this.showWelcomeMessage();

        // Refresh buttons on reset
        this.refreshQuickActions();

        this.updateSessionDisplay();

        await this.initBackendSession();

        this.showToast('✓ New chat session started!');
        console.log('New session created:', this.sessionId);
    }

    showToast(message) {
        const existingToast = this.window.querySelector('.chatbot-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'chatbot-toast';
        toast.textContent = message;
        this.window.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getUserEmail() {
        const emailEl = document.getElementById('user-email');
        return (emailEl && emailEl.textContent !== '...' && emailEl.textContent !== 'Loading...') ? emailEl.textContent : null;
    }

    async loadHistory() {
        // Check if we should create a new session instead of loading history
        if (this.pendingNewSession) {
            this.pendingNewSession = false;
            await this.forceNewSession();
            return;
        }

        if (this.historyLoaded) return;
        
        const email = this.getUserEmail();
        if (!email) return;

        this.userId = email;
        
        try {
            const listRes = await fetch(`/api/sessions?user_id=${encodeURIComponent(this.userId)}&app_name=${APP_NAME}`);
            if (!listRes.ok) throw new Error("Failed to list sessions");
            
            const sessions = await listRes.json();
            
            if (sessions && sessions.length > 0) {
                sessions.sort((a, b) => {
                    const timeA = parseInt(a.id.split('-').pop()) || 0;
                    const timeB = parseInt(b.id.split('-').pop()) || 0;
                    return timeB - timeA;
                });

                const lastSession = sessions[0];
                this.sessionId = lastSession.id;
                this.updateSessionDisplay();
                console.log("Restoring session:", this.sessionId);

                const detailRes = await fetch(`/api/sessions/${this.sessionId}?user_id=${encodeURIComponent(this.userId)}&app_name=${APP_NAME}`);
                if (detailRes.ok) {
                    const sessionData = await detailRes.json();
                    this.renderHistory(sessionData.events);
                    this.historyLoaded = true;
                    
                    // Show actions even if history loaded
                    this.refreshQuickActions();
                    return;
                }
            }
        } catch (e) {
            console.error("Error loading history:", e);
        }

        if (!this.sessionId) {
            this.sessionId = `${this.userId}-${Math.floor(Date.now() / 1000)}`;
            this.updateSessionDisplay();
            await this.initBackendSession();
            // Show actions for new session
            this.refreshQuickActions();
        }
    }

    async initBackendSession() {
        try {
            const url = `${AGENT_API_URL}/apps/${APP_NAME}/users/${this.userId}/sessions/${this.sessionId}`;
            const payload = {
                userId: this.userId,
            };
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Backend session initialized:', this.sessionId);
        } catch (e) {
            console.error("Backend session init failed", e);
        }
    }

    renderHistory(events) {
        if (!events || events.length === 0) return;
        
        this.messages.innerHTML = '';
        this.messageCount = events.length;

        events.forEach(event => {
            let text = "";
            if (event.parts) {
                event.parts.forEach(p => text += p.text);
            }
            if (!text) return;

            const author = (event.author || "").toLowerCase();
            const role = (event.role || "").toLowerCase();
            
            let uiSender = 'bot';
            if (author === 'user' || (role === 'user' && author !== 'rootagent')) {
                uiSender = 'user';
            }

            this.addMessage(text, uiSender, false);
        });
        
        this.scrollToBottom();
    }

    // Messaging Logic

    async sendMessage(messageText = null) {
        const text = messageText || this.input.value.trim();
        if (!text) return;

        const email = this.getUserEmail();
        if (!email) {
            this.addMessage("Please sign in to chat.", 'bot');
            return;
        }

        if (!this.sessionId) {
            await this.loadHistory();
        }

        // Hide actions while waiting for response
        if (this.quickActions) this.quickActions.style.display = 'none';
        
        this.addMessage(text, 'user');
        this.input.value = '';
        this.showTyping();

        try {
            const url = `${AGENT_API_URL}/run`;
            const payload = {
                appName: APP_NAME,
                userId: this.userId,
                sessionId: this.sessionId,
                newMessage: {
                    role: "user",
                    parts: [{ text: text }]
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            this.hideTyping();
            this.handleAgentResponse(data);

        } catch (e) {
            console.error(e);
            this.hideTyping();
            this.addMessage("Sorry, I encountered a connection error.", 'bot');
            // Re-show actions on error
            if (this.quickActions) this.quickActions.style.display = 'grid';
        }
    }

    handleAgentResponse(data) {
        let finalText = "";
        let foundResponse = false;
        let generatedSql = null;

        if (Array.isArray(data)) {
            for (let i = data.length - 1; i >= 0; i--) {
                const item = data[i];
                const role = item.role || (item.content && item.content.role);
                
                if (role === 'model') {
                    const content = item.content || {};
                    const parts = content.parts || [];
                    for (const part of parts) {
                        if (part.text) {
                            finalText = part.text;
                            foundResponse = true;
                            break;
                        }
                    }
                }
                if (foundResponse) break;
            }

            for (const item of data) {
                if (item.actions && item.actions.stateDelta && item.actions.stateDelta.generated_sql) {
                    generatedSql = item.actions.stateDelta.generated_sql;
                }
            }
        }

        if (!finalText && !foundResponse) {
            finalText = "I processed your request but didn't generate a text response (Check logs).";
        }

        if (generatedSql) {
            finalText += `<br><br><div style="background:#e0f2fe; padding:8px; border-radius:4px; font-family:monospace; font-size:11px; color:#0c4a6e; border:1px solid #bae6fd;"><strong>Generated SQL:</strong><br>${generatedSql}</div>`;
        }

        this.addMessage(finalText, 'bot');
        
        // ROTATE AND SHOW BUTTONS AFTER RESPONSE
        this.refreshQuickActions();
    }

    // UI Helpers

    addMessage(text, sender, autoScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        let avatarHTML;
        if (sender === 'bot') {
            avatarHTML = '<div class="message-avatar">🤖</div>';
        } else {
            const userAvatarEl = document.getElementById('user-avatar');
            const hasProfilePic = userAvatarEl && userAvatarEl.src && !userAvatarEl.src.includes('placeholder');
            
            if (hasProfilePic) {
                avatarHTML = `<img src="${userAvatarEl.src}" class="message-avatar" style="object-fit: cover;" alt="User">`;
            } else {
                avatarHTML = '<div class="message-avatar">👤</div>';
            }
        }
        
        let formattedText = text.replace(/\n/g, '<br>');
        
        marked.setOptions({ breaks: true });
        let rawHtml = marked.parse(text);
        let safeHtml = DOMPurify.sanitize(rawHtml);

        messageDiv.innerHTML = `
            ${avatarHTML}
            <div class="message-content">
                <div class="message-bubble">${safeHtml}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        
        this.messages.appendChild(messageDiv);
        this.messageCount++;
        if (autoScroll) this.scrollToBottom();
    }

    showWelcomeMessage() {
        const welcomeMsg = `
            <div class="message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-bubble">
                        👋 Welcome to DataDash!
                        <br><br>
                        I am here to answer your questions to the best of my knowledge.
                    </div>
                    <div class="message-time">${this.getCurrentTime()}</div>
                </div>
            </div>
        `;
        this.messages.innerHTML = welcomeMsg;
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            if (this.pendingNewSession && this.getUserEmail()) {
                this.pendingNewSession = false;
                this.forceNewSession();
            } else if (!this.historyLoaded) {
                this.loadHistory();
            }
            this.window.classList.add('show');
            this.iconChat.style.display = 'none';
            this.iconClose.style.display = 'flex';
            this.input.focus();
            this.hideNotification();
        } else {
            this.window.classList.remove('show');
            this.iconChat.style.display = 'flex';
            this.iconClose.style.display = 'none';
        }
    }

    showNotification() {
        if (this.badge) {
            this.badge.textContent = '1';
            this.badge.style.display = 'flex';
        }
    }

    hideNotification() {
        if (this.badge) this.badge.style.display = 'none';
    }

    showTyping() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'flex';
            this.scrollToBottom();
        }
    }

    hideTyping() {
        if (this.typingIndicator) this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            if (this.messages) this.messages.scrollTop = this.messages.scrollHeight;
        }, 100);
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new Chatbot();
});