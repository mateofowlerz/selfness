import { CONDITIONS, type Listing } from "../../../shared/types";

interface Props {
  listing: Listing;
  onChange: (patch: Partial<Listing>) => void;
}

const CURRENCIES = ["GBP", "EUR", "USD"];

export function ListingForm({ listing, onChange }: Props): React.ReactElement {
  return (
    <div className="form">
      <label className="field">
        <span>Title</span>
        <input
          type="text"
          value={listing.title}
          maxLength={80}
          placeholder="e.g. Vintage Levi's 501 denim jacket"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          rows={5}
          value={listing.description}
          placeholder="Condition notes, measurements, fit…"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Price</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={listing.price || ""}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
          />
        </label>
        <label className="field field--narrow">
          <span>Currency</span>
          <select value={listing.currency} onChange={(e) => onChange({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Condition</span>
          <select
            value={listing.condition}
            onChange={(e) => onChange({ condition: e.target.value as Listing["condition"] })}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Brand</span>
          <input type="text" value={listing.brand ?? ""} onChange={(e) => onChange({ brand: e.target.value })} />
        </label>
        <label className="field">
          <span>Size</span>
          <input type="text" value={listing.size ?? ""} onChange={(e) => onChange({ size: e.target.value })} />
        </label>
        <label className="field">
          <span>Colour</span>
          <input type="text" value={listing.color ?? ""} onChange={(e) => onChange({ color: e.target.value })} />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Category</span>
          <input
            type="text"
            value={listing.category ?? ""}
            placeholder="e.g. Women's jackets"
            onChange={(e) => onChange({ category: e.target.value })}
          />
        </label>
        <label className="field field--narrow">
          <span>Package size</span>
          <select
            value={listing.packageSize ?? "small"}
            onChange={(e) => onChange({ packageSize: e.target.value as Listing["packageSize"] })}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Tags / hashtags</span>
        <input
          type="text"
          value={listing.tags.join(", ")}
          placeholder="comma separated, e.g. vintage, denim, y2k"
          onChange={(e) =>
            onChange({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </div>
  );
}
