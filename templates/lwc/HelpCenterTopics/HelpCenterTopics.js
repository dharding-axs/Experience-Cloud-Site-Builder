// Replace {{Prefix}}HelpCenterTopics → your class name
import { LightningElement } from 'lwc';

export default class {{Prefix}}HelpCenterTopics extends LightningElement {
    handleShowMore() {
        this.dispatchEvent(new CustomEvent('showmore', {
            bubbles: true,
            composed: true
        }));
    }
}
