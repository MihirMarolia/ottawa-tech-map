# Ottawa public demo data contract v1

`data/ottawa-demo/companies.csv` is a controlled, reviewed seed input, not an arbitrary institutional export. Column names are fixed. Every row includes a canonical domain, Ottawa headquarters, operating status, description, sector, verification date, and official Source URL. Unsupported employee bands and founding years remain blank.

The importer performs deterministic validation and emits typed Company proposals. It does not scrape pages, infer missing values, create Companies automatically, or write around the Review Queue. Its commit callback must connect to an approved persistence workflow; unresolved identity returns `review_required`.

`sources.csv` is the provenance manifest. It contains Source metadata and no copied page bodies, personal information, or unrestricted research notes. `observed_date` records when the public page was verified; it is not a publication date.

This version permits only `active`, `inactive`, or `merged` operating status. Canonical domains are lowercase hostnames without schemes or paths. Dates use `YYYY-MM-DD`.
