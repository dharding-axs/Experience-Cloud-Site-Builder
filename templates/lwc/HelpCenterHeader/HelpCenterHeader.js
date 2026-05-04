// Replace: {{prefix}}LogoLight → your logo static resource name
//          {{Prefix}}HelpCenterHeader → your class name
import { LightningElement, track } from 'lwc';
import logoLight from '@salesforce/resourceUrl/{{prefix}}LogoLight';

export default class {{Prefix}}HelpCenterHeader extends LightningElement {
    logoUrl = logoLight;
    @track menuOpen = false;

    get mobileMenuClass() {
        return this.menuOpen ? '{{prefix}}-mobile-menu {{prefix}}-mobile-menu-open' : '{{prefix}}-mobile-menu';
    }

    get hamburgerClass() {
        return this.menuOpen ? '{{prefix}}-hamburger {{prefix}}-hamburger-open' : '{{prefix}}-hamburger';
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }
}
