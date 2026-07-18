# Ubiquitous Language

## Company

A canonical corporate entity being tracked by the system.

A Company is not identified solely by its display name. Identity may be
supported by canonical domain, business identifiers, aliases, jurisdiction,
and reviewed evidence.

Do not call it:
- startup record
- vendor row
- organization item
- business object

## Source

A retrievable external origin from which corporate evidence was observed.

Examples:
- procurement notice
- company website
- funding announcement
- job posting
- institutional CSV export

A Source is metadata about provenance. It is not the extracted claim.

## Source Document

A privacy-sanitized representation of source material eligible for processing.

Raw unsanitized source content must not be persisted as a Source Document.

## Signal

A time-bound, source-backed observation about one or more Companies.

Examples:
- government contract awarded
- non-dilutive funding received
- job posting observed
- technology adoption observed
- operating-status change reported

A Signal is evidence, not a final conclusion.

## Company Fact

A current normalized attribute inferred or verified from one or more Signals.

Examples:
- primary sector
- operating status
- employee range
- active government vendor status

A Company Fact must retain evidence lineage.

## Evidence

The provenance and structured support for a Signal or Company Fact.

Evidence includes:
- source
- observation date
- extraction method
- confidence
- review status

## Entity Resolution

The process of determining whether an incoming organization reference belongs
to an existing Company or should create a new Company.

Ambiguous matches must enter the Review Queue.

## Review Queue

A human-decision surface for ambiguous, conflicting, low-confidence, or
privacy-rejected records.

The Review Queue is not an error log.

## Government Intent

Source-backed evidence that a public institution is actively considering,
buying, contracting with, or qualifying a Company.

Government Intent is broader than awarded contract value.

## Capital Efficiency

Evidence that a Company has generated operating maturity, commercial traction,
or institutional demand relative to its disclosed equity capital and team size.

Capital Efficiency is not calculated from funding alone.

## CEGI Score

Capital Efficiency and Government Intent score.

An explainable, versioned ranking signal derived from evidence-backed
components and penalties.

The CEGI Score is not a prediction of company success.

## Ingestion Run

One idempotent execution that reads one or more Sources and produces accepted,
rejected, or review-required records.

## Ecosystem Dependency

A material corporate reliance on a platform, vendor network, public institution,
research institution, supply chain, or commercial ecosystem.

## Founder Lineage

Institutional experience associated with company leadership, represented only
as an approved organization-level category.

Do not store individual biographies or personal profiles.
