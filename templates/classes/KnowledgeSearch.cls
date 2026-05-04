// Invocable Apex for Agentforce agent Knowledge search.
// REPLACE BEFORE DEPLOYING:
//   {{Prefix}}KnowledgeSearch → your class name (e.g. AcmeKnowledgeSearch)
//   {{ClientName}}            → your client name in @InvocableMethod label/category
//   {{prefix}}-               → your Knowledge article URL prefix (e.g. 'acme-%')

public with sharing class {{Prefix}}KnowledgeSearch {

    public class SearchInput {
        @InvocableVariable(required=true description='Search query for knowledge articles')
        public String searchQuery;
    }

    public class SearchOutput {
        @InvocableVariable(description='Search results as formatted text')
        public String searchResults;
    }

    @InvocableMethod(label='Search {{ClientName}} Knowledge Articles'
                     description='Searches knowledge articles by keyword or topic'
                     category='{{ClientName}}')
    public static List<SearchOutput> searchArticles(List<SearchInput> inputs) {
        List<SearchOutput> outputs = new List<SearchOutput>();

        for (SearchInput input : inputs) {
            SearchOutput output = new SearchOutput();
            String searchTerm = '%' + input.searchQuery + '%';

            try {
                List<Knowledge__kav> articles = [
                    SELECT Id, Title, Summary, UrlName, ArticleNumber
                    FROM Knowledge__kav
                    WHERE (Title LIKE :searchTerm OR Summary LIKE :searchTerm)
                    AND UrlName LIKE '{{prefix}}-%'       // REPLACE: {{prefix}}-% with your article URL prefix
                    AND PublishStatus = 'Online'
                    AND Language = 'en_US'
                    ORDER BY LastPublishedDate DESC
                    LIMIT 5
                ];

                if (articles.isEmpty()) {
                    output.searchResults = 'No articles found for: ' + input.searchQuery;
                } else {
                    List<String> results = new List<String>();
                    for (Knowledge__kav article : articles) {
                        String entry = '- ' + article.Title;
                        if (article.Summary != null) {
                            entry += ': ' + article.Summary;
                        }
                        results.add(entry);
                    }
                    output.searchResults = 'Found ' + articles.size() + ' articles:\n' + String.join(results, '\n');
                }

            } catch (Exception e) {
                output.searchResults = 'Unable to search articles at this time.';
            }

            outputs.add(output);
        }

        return outputs;
    }
}
