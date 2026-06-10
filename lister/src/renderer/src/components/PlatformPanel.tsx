import { type ConnectionStatus, type Platform, PLATFORM_LABELS } from "../../../shared/types";

interface Props {
  platform: Platform;
  status?: ConnectionStatus;
  selected: boolean;
  onToggle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function PlatformPanel({
  platform,
  status,
  selected,
  onToggle,
  onConnect,
  onDisconnect,
}: Props): React.ReactElement {
  const connected = status?.connected ?? false;
  return (
    <div className={`platform${selected ? " platform--selected" : ""}`}>
      <label className="platform__check">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span className="platform__name">{PLATFORM_LABELS[platform]}</span>
      </label>

      <div className="platform__status">
        <span className={`dot${connected ? " dot--on" : ""}`} />
        <span>
          {connected ? status?.account || status?.detail || "Connected" : "Not connected"}
        </span>
      </div>

      {connected ? (
        <button type="button" className="link" onClick={onDisconnect}>
          Disconnect
        </button>
      ) : (
        <button type="button" className="link" onClick={onConnect}>
          Connect
        </button>
      )}
    </div>
  );
}
