// {{PREFIX}} Global Styles — invisible LWC that injects global CSS via loadStyle.
// Replace: {{prefix}}HelpCenterOverrides → your static resource name
//          {{Prefix}}GlobalStyles → your class name
import { LightningElement } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import overrides from '@salesforce/resourceUrl/{{prefix}}HelpCenterOverrides';

export default class {{Prefix}}GlobalStyles extends LightningElement {
    stylesLoaded = false;

    renderedCallback() {
        if (this.stylesLoaded) return;
        this.stylesLoaded = true;
        loadStyle(this, overrides);
    }
}
