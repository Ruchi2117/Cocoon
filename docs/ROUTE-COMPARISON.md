# Route comparison and reported-concern zones

Cocoon ranks provider-returned walking candidates; it does not search the entire road graph for a globally safest path. OSRM may return fewer than three alternatives. Shared geometry stays street-accurate only for the live walking provider. Dashed seeded candidates are illustrations.

## Implemented model

Default weights: concerns 65%, extra distance 20%, missing observation coverage 15%. Sliders normalize to their sum. All zero disables preference claims. Nighttime is an explicit user toggle, not inferred.

Only visible, valid-dated observations from the last 90 days count. Synthetic reports are excluded unless the user enables a labelled demo. Location uses the rounded public pin. Same rounded point/category/source type/day is deduplicated.

Base concern units: harassment 5, unsafe transport 4, poor lighting 3, deserted stretch 3, other 1. Well-lit/busy and police-presence observations add no negative units and never cancel concerns. No verification bonus for community agreement or attribution. These are transparent policy weights, not calibrated risk probabilities.

Units halve every 30 days. Nighttime lighting units multiply by 1.5. Spatial influence falls linearly to zero at 200 metres. Routes are sampled at equal-distance midpoints approximately every 50 metres (maximum 250 samples). Strongest local signal is integrated over length, avoiding duplicate-report pileups and polyline vertex-density bias.

E = concern exposure in units-km. D = excess distance over shortest returned candidate / shortest distance. U = fraction of sampled distance without any eligible observation within 200 m.

Cost = 100 * (wE * E/(1+E) + wD * D/(1+D) + wU * U) / sum(weights).

Lower cost means a preference match among candidates, not a safety percentage. Sparse reports can make evidence-based safety comparison impossible. Positive observations indicate only observed context, not complete coverage or proof of safety. No live lighting, footfall, CCTV, accessibility, main-road share or police availability is fabricated.

Hot zones: coarse 0.003-degree cells with 220 m illustrative circles and report counts. These are reported-concern clusters, not crime boundaries, incident rates or demographic risk. Synthetic zones have dashed borders and explicit labels. News headlines are never converted into map incidents.

## Validation and operational limits

Tests cover preference reversal, no-report uncertainty, synthetic/hidden/stale/future exclusion, decay, night factor, duplicates/positive signals and vertex-density invariance. Browser QA toggled synthetic demo data, cycled weights, verified changed preference and selected a new map path. No GPS, journey sharing or incident submission used.

Next production requirements: a contracted/self-hosted routing graph with edge costs, vetted time-sensitive environmental data, trusted official incident integrations, abuse-resistant report provenance, empirical calibration, coverage audits, accessibility and pedestrian access validation. Current model is explicitly a comparison prototype, not an emergency navigation guarantee.

Provider reference: https://project-osrm.org/docs/v5.24.0/api/#route-service
