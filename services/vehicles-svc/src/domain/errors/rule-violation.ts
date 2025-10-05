import { DomainError } from "./domain-error";
export class RuleViolation extends DomainError {
    constructor(msg: string) { super(msg); this.name = "RuleViolation"; }
}
