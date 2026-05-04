// Replace {{Prefix}}HelpCenterSearch → your class name
import { LightningElement, track } from 'lwc';

export default class {{Prefix}}HelpCenterSearch extends LightningElement {
    @track searchTerm = '';

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSearch() {
        this.dispatchEvent(new CustomEvent('search', {
            detail: { query: this.searchTerm },
            bubbles: true,
            composed: true
        }));
    }
}
