// Concept B/C Tier 2: Knowledge-powered chat response controller.
// REPLACE BEFORE DEPLOYING:
//   {{Prefix}}AgentChatController → your class name (e.g. AcmeAgentChatController)
//   {{prefix}}-                   → your Knowledge article URL prefix (e.g. 'acme-%')
//
// CUSTOMER-SPECIFIC: update TOPIC_URLS to match the client's Knowledge article UrlNames.
// Article UrlNames must match the prefix pattern set in queryByKeywords().
// Use without sharing — guest users have no sharing rules for Knowledge.

public without sharing class {{Prefix}}AgentChatController {

    static final Set<String> STOP_WORDS = new Set<String>{
        'want', 'need', 'have', 'does', 'what', 'how', 'about', 'from',
        'with', 'that', 'this', 'the', 'for', 'can', 'get', 'any',
        'your', 'my', 'me', 'do', 'is', 'it', 'in', 'on', 'to', 'a',
        'an', 'of', 'or', 'and', 'not', 'no', 'be', 'am', 'are', 'was',
        'were', 'been', 'being', 'had', 'has', 'did', 'doing', 'will',
        'would', 'could', 'should', 'shall', 'may', 'might', 'must',
        'there', 'here', 'where', 'when', 'why', 'which', 'who', 'whom',
        'each', 'every', 'all', 'both', 'few', 'more', 'most', 'other',
        'some', 'such', 'than', 'too', 'very', 'just', 'also', 'into',
        'like', 'know', 'tell', 'help', 'please', 'thanks', 'thank',
        'looking', 'question', 'different', 'specific', 'later', 'time'
    };

    // ── CUSTOMER-SPECIFIC: map topic names to Knowledge article UrlNames ─────
    static final Map<String, List<String>> TOPIC_URLS = new Map<String, List<String>>{
        'topic1' => new List<String>{
            '{{prefix}}-article-topic1-a',
            '{{prefix}}-article-topic1-b',
            '{{prefix}}-article-topic1-c'
        },
        'topic2' => new List<String>{
            '{{prefix}}-article-topic2-a',
            '{{prefix}}-article-topic2-b'
        },
        'topic3' => new List<String>{
            '{{prefix}}-article-topic3-a',
            '{{prefix}}-article-topic3-b'
        },
        'topic4' => new List<String>{
            '{{prefix}}-article-topic4-a',
            '{{prefix}}-article-topic4-b'
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    @AuraEnabled
    public static Map<String, String> getAgentResponse(String userMessage, String topic) {
        try {
            List<Knowledge__kav> articles = new List<Knowledge__kav>();

            if (String.isNotBlank(topic) && TOPIC_URLS.containsKey(topic)) {
                articles = queryByTopic(topic);
            }

            if (articles.isEmpty()) {
                articles = queryByKeywords(userMessage);
            }

            if (articles.isEmpty()) {
                return new Map<String, String>{
                    'success' => 'false',
                    'response' => ''
                };
            }

            String response = '';
            if (articles.size() == 1) {
                Knowledge__kav article = articles[0];
                response = article.Summary != null ? article.Summary : article.Title;
            } else {
                response = 'Here\'s what I found:\n\n';
                for (Knowledge__kav article : articles) {
                    response += '• ' + article.Title;
                    if (article.Summary != null) {
                        response += ' — ' + article.Summary;
                    }
                    response += '\n';
                }
                response += '\nWould you like more details on any of these?';
            }

            return new Map<String, String>{
                'success' => 'true',
                'response' => response
            };
        } catch (Exception e) {
            return new Map<String, String>{
                'success' => 'false',
                'error' => e.getMessage()
            };
        }
    }

    static List<Knowledge__kav> queryByTopic(String topic) {
        List<String> urlNames = TOPIC_URLS.get(topic);
        if (urlNames == null || urlNames.isEmpty()) return new List<Knowledge__kav>();

        return [
            SELECT Title, Summary FROM Knowledge__kav
            WHERE UrlName IN :urlNames
            AND PublishStatus = 'Online' AND Language = 'en_US'
            ORDER BY LastPublishedDate DESC
            LIMIT 3
        ];
    }

    static List<Knowledge__kav> queryByKeywords(String userMessage) {
        if (String.isBlank(userMessage)) return new List<Knowledge__kav>();

        List<String> keywords = new List<String>();
        for (String word : userMessage.toLowerCase().split('\\s+')) {
            String cleaned = word.replaceAll('[^a-z0-9]', '');
            if (cleaned.length() >= 3 && !STOP_WORDS.contains(cleaned)) {
                keywords.add(cleaned);
            }
        }

        for (String keyword : keywords) {
            String keywordTerm = '%' + String.escapeSingleQuotes(keyword) + '%';
            List<Knowledge__kav> articles = [
                SELECT Title, Summary
                FROM Knowledge__kav
                WHERE (Title LIKE :keywordTerm OR Summary LIKE :keywordTerm)
                AND UrlName LIKE '{{prefix}}-%'       // REPLACE: {{prefix}}-% with your article URL prefix
                AND PublishStatus = 'Online'
                AND Language = 'en_US'
                ORDER BY LastPublishedDate DESC
                LIMIT 3
            ];
            if (!articles.isEmpty()) return articles;
        }

        return new List<Knowledge__kav>();
    }
}
