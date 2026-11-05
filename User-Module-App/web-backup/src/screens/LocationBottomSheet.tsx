import { useEffect, useState } from "react";
import { Button, Icon } from "../ui";
import { useStore, type Place } from "../store";
import { useNav } from "../nav";
import { detectCurrentLocation } from "../services/location.service";
import { getLiveServiceSpots, type Spot, spotLabel } from "../places";
import { useI18n } from "../i18n";

interface LocationBottomSheetProps {
  isOpen?: boolean;
  canDismiss?: boolean;
  onClose?: () => void;
  onConfirmed?: (address: string, coords?: { lat: number; lng: number }) => void;
}

export function LocationBottomSheet({
  canDismiss = true,
  onClose,
  onConfirmed,
}: LocationBottomSheetProps) {
  const { t } = useI18n();
  const nav = useNav();
  const {
    places,
    setPlaces,
    place,
    setPlace,
    setPickup,
    setDeliveryCoords,
    setLocationConfirmed,
    fetchLiveRestaurants,
  } = useStore();

  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [showAllSaved, setShowAllSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getLiveServiceSpots().then((res) => {
      if (active && res.length > 0) setSpots(res);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectAndConfirm = (
    address: string,
    coords?: { lat: number; lng: number }
  ) => {
    const finalCoords = coords || { lat: 26.8467, lng: 80.9462 };
    setPlace(address);
    setPickup(address);
    setDeliveryCoords(finalCoords);
    setLocationConfirmed(true);

    try {
      localStorage.setItem("roadrider_location_confirmed", "true");
      localStorage.setItem("roadrider_selected_address", address);
      localStorage.setItem(
        "roadrider_selected_coords",
        JSON.stringify(finalCoords)
      );
    } catch {}

    // Refresh restaurants based on selected delivery location
    fetchLiveRestaurants();

    if (onConfirmed) {
      onConfirmed(address, finalCoords);
    }
    if (onClose) {
      onClose();
    }
  };

  const useGps = async () => {
    setLocating(true);
    setGpsError("");
    try {
      const res = await detectCurrentLocation();
      if (!res.success) {
        setLocating(false);
        if (res.statusCode === "permission_denied") {
          setGpsError(t("loc_permission_denied_sub"));
        } else {
          setGpsError(res.error || "Unable to detect GPS coordinates.");
        }
        return;
      }

      const addr = res.address!;
      if (!addr.isServiceable) {
        setLocating(false);
        nav.open("A16", { place: `${addr.locality}, ${addr.city}` });
        return;
      }

      const fullAddr = `${addr.locality}, ${addr.city}`;
      selectAndConfirm(fullAddr, { lat: addr.latitude, lng: addr.longitude });
    } catch {
      setGpsError("Failed to detect location. Please search or pick a saved address.");
    } finally {
      setLocating(false);
    }
  };

  const q = query.trim().toLowerCase();
  const savedFiltered = places.filter(
    (p) => `${p.label} ${p.address}`.toLowerCase().includes(q)
  );
  const spotsFiltered = spots.filter((s) =>
    `${s.name} ${s.area}`.toLowerCase().includes(q)
  );

  const displayedSaved = showAllSaved ? savedFiltered : savedFiltered.slice(0, 3);

  return (
    <div
      className="location-sheet-overlay"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="location-sheet-container"
        style={{
          width: "100%",
          maxHeight: "calc(88dvh - var(--safe-top, 0px))",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
      >
        {/* Drag handle & Header */}
        <div
          style={{
            padding: "0.75rem 1.25rem 0.5rem",
            borderBottom: "1px solid #F3F4F6",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "4px",
              backgroundColor: "#E5E7EB",
              borderRadius: "999px",
              margin: "0 auto 0.75rem",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                }}
              >
                {t("loc_sheet_title")}
              </h2>
              <small style={{ color: "#6B7280" }}>
                Choose where you want your deliveries delivered
              </small>
            </div>
            {canDismiss && onClose && (
              <button
                onClick={onClose}
                aria-label="Close location selector"
                style={{
                  background: "#F3F4F6",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: "1rem 1.25rem calc(2.25rem + var(--safe-bottom, 0px))",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* 1. Search Location Manually */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              backgroundColor: "#F9FAFB",
              border: "1.5px solid #E5E7EB",
              borderRadius: "14px",
              padding: "0.6rem 0.9rem",
              gap: "0.6rem",
            }}
          >
            <Icon name="search" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("loc_search_placeholder")}
              aria-label="Search location manually"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "0.95rem",
                color: "#111827",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear location search"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                }}
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* 2. Device Location Permission Card */}
          <div
            style={{
              backgroundColor: "#FFF7ED",
              border: "1px solid #FFEDD5",
              borderRadius: "16px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div
                style={{
                  backgroundColor: "#EA580C",
                  color: "#FFFFFF",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="pin" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.95rem",
                    color: "#9A3412",
                    marginBottom: "0.2rem",
                  }}
                >
                  {t("loc_permission_card_title")}
                </strong>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#C2410C", lineHeight: 1.35 }}>
                  {t("loc_permission_card_sub")}
                </p>
              </div>
            </div>

            <Button
              onClick={useGps}
              loading={locating}
              disabled={locating}
            >
              <Icon name="pin" size={16} />
              {locating ? t("loc_detecting") : t("loc_enable_btn")}
            </Button>

            {gpsError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: "#DC2626",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  marginTop: "0.25rem",
                }}
              >
                <Icon name="alert" size={14} />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* 3. Saved Addresses Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1F2937" }}>
                  {t("loc_saved_addresses")}
                </h3>
                {places.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "#F3F4F6",
                      color: "#4B5563",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.1rem 0.5rem",
                      borderRadius: "999px",
                    }}
                  >
                    {places.length}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {places.length > 3 && (
                  <button
                    onClick={() => setShowAllSaved(!showAllSaved)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EA580C",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showAllSaved ? "Show Less" : t("loc_see_all")}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onClose) onClose();
                    nav.open("C7");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EA580C",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {t("loc_add_new")}
                </button>
              </div>
            </div>

            {places.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#F9FAFB",
                  border: "1px dashed #D1D5DB",
                  borderRadius: "14px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#6B7280" }}>
                  {t("loc_no_saved")}
                </p>
                <button
                  onClick={() => {
                    if (onClose) onClose();
                    nav.open("C7");
                  }}
                  style={{
                    backgroundColor: "#EA580C",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add an address
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {displayedSaved.map((p) => {
                  const isCurrent = place === p.address;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 0.9rem",
                        backgroundColor: isCurrent ? "#FFF7ED" : "#FFFFFF",
                        border: isCurrent ? "1.5px solid #EA580C" : "1px solid #E5E7EB",
                        borderRadius: "14px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() =>
                        selectAndConfirm(p.address, {
                          lat: p.latitude || 26.8467,
                          lng: p.longitude || 80.9462,
                        })
                      }
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                        <span
                          style={{
                            marginTop: "0.15rem",
                            color: isCurrent ? "#EA580C" : "#6B7280",
                          }}
                        >
                          <Icon
                            name={p.kind === "Home" ? "home" : p.kind === "Work" ? "pin" : "map"}
                            size={18}
                          />
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <strong style={{ fontSize: "0.9rem", color: "#111827" }}>
                              {p.label === "Home"
                                ? t("loc_home")
                                : p.label === "Work"
                                ? t("loc_work")
                                : p.label}
                            </strong>
                            {isCurrent && (
                              <span
                                style={{
                                  backgroundColor: "#EA580C",
                                  color: "#FFF",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "999px",
                                }}
                              >
                                Selected
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              margin: "0.15rem 0 0",
                              fontSize: "0.8rem",
                              color: "#6B7280",
                              lineHeight: 1.3,
                            }}
                          >
                            {p.address}
                          </p>
                          {p.receiver && (
                            <small style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>
                              {p.receiver} {p.phone ? `· ${p.phone}` : ""}
                            </small>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaces((prev) => prev.filter((x) => x.id !== p.id));
                          }}
                          aria-label={`Delete ${p.label}`}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#9CA3AF",
                            cursor: "pointer",
                            padding: "0.3rem",
                          }}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                        <Icon name="arrow" size={15} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Popular Service Areas & Search Results */}
          <div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#1F2937",
              }}
            >
              {q ? "Matching Locations" : "Serviceable Localities"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {spotsFiltered.map((s) => (
                <div
                  key={s.name}
                  onClick={() => {
                    if (s.served) {
                      selectAndConfirm(spotLabel(s), {
                        lat: s.lat || 26.8467,
                        lng: s.lng || 80.9462,
                      });
                    } else {
                      nav.open("A16", { place: spotLabel(s) });
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.65rem 0.9rem",
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #F3F4F6",
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <Icon name="pin" size={16} />
                    <div>
                      <strong style={{ fontSize: "0.88rem", color: "#111827" }}>
                        {s.name}
                      </strong>
                      <small style={{ display: "block", color: "#6B7280", fontSize: "0.75rem" }}>
                        {s.area}
                      </small>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.5rem",
                      borderRadius: "999px",
                      backgroundColor: s.served ? "#DCFCE7" : "#FEE2E2",
                      color: s.served ? "#15803D" : "#991B1B",
                    }}
                  >
                    {s.served ? t("loc_available") : t("loc_coming_soon")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
