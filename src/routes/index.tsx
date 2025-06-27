import { createFileRoute } from "@tanstack/react-router";
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	Polyline,
	useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent } from "leaflet";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import polyline from "@mapbox/polyline";

export const Route = createFileRoute("/")({
	component: App,
});

interface MapListenerProps {
	onClick: (e: LeafletMouseEvent) => void;
}

interface LatLng {
	lat: number;
	lng: number;
}

function MapListener({ onClick }: MapListenerProps) {
	useMapEvents({
		click(e) {
			onClick(e);
		},
	});
	return null;
}

async function fetchRoute(waypoints: LatLng[]) {
	const waypointsStr = waypoints
		.map((latlng) => `${latlng.lng},${latlng.lat}`)
		.join(";");

	return fetch(
		`http://127.0.0.1:5000/route/v1/driving/${waypointsStr}?steps=true&overview=full`,
	)
		.then((response) => response.json())
		.then((json) => {
			const geometry = json.routes[0].geometry;
			return polyline.decode(geometry);
		});
}

interface MarkersBoxProps {
	markers: LatLng[];
}

function MarkerSection({ marker }: { marker: LatLng }) {
	const markerValue = `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`;

	return (
		<div className="flex p-2 gap-2">
			<p>Marcador</p>
			<input
				className="bg-gray-300 w-full"
				type="text"
				readOnly
				value={markerValue}
			/>
			<button className="bg-gray-300">X</button>
		</div>
	);
}

function MarkersBox({ markers }: MarkersBoxProps) {
	return (
		<div className="relative">
			<div className="absolute inset-0">
				<div className="bg-white rounded-md m-2 w-sm">
					<p className="text-2xl text-center text-blue-800">
						Marcadores de rota
					</p>

					{markers.map((marker, index) => (
						<MarkerSection key={index} marker={marker} />
					))}
				</div>
			</div>
		</div>
	);
}

function DraggableMarker({
	onChangePosition,
	positionProp,
}: {
	onChangePosition: (prev: LatLng, next: LatLng) => void;
	positionProp: LatLng;
}) {
	const [draggable, setDraggable] = useState(true);
	const [position, setPosition] = useState(positionProp);
	const markerRef = useRef(null);
	const eventHandlers = useMemo(
		() => ({
			dragend() {
				const marker = markerRef.current;
				if (marker != null) {
					const nextPos = marker.getLatLng()

					onChangePosition(position, nextPos)
					setPosition(nextPos);
				}
			},
		}),
		[],
	);
	const toggleDraggable = useCallback(() => {
		setDraggable((d) => !d);
	}, []);

	return (
		<Marker
			draggable={draggable}
			eventHandlers={eventHandlers}
			position={position}
			ref={markerRef}
		>
		</Marker>
	);
}

function App() {
	const defaultPosition: LatLng = { lat: -9.649848, lng: -35.708949 };
	const [markers, setMarkers] = useState<LatLng[]>([]);
	const [routes, setRoutes] = useState<Array<[number, number]>>([]);

	function addMarkerAt(latlng: LatLng) {
		setMarkers((prev) => [...prev, latlng]);
	}

	function handlerOnClick(e: LeafletMouseEvent) {
		const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };

		addMarkerAt(latlng);
	}

	useEffect(() => {
		if (markers.length < 2) {
			return;
		}

		fetchRoute(markers).then((coords) => {
			setRoutes(coords);
		});
	}, [markers]);

	function handlerOnChangePosition(prev: LatLng, next: LatLng) {
		setMarkers((currentMarkers) => {
			const newMarkers = [...currentMarkers];

			for (let i = 0; i < newMarkers.length; i++) {
				if (
					newMarkers[i].lat === prev.lat &&
						newMarkers[i].lng === prev.lng
				) {
					newMarkers[i] = next;
				}
			}

			console.log(newMarkers)

			return newMarkers;
		});
	}

	return (
		<div className="relative">
			<MarkersBox markers={markers} />

			<div className="absolute inset-0 z-[-1]">
				<MapContainer
					center={defaultPosition}
					zoom={13}
					style={{ height: "100dvh" }}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{markers.map((position, index) => (
						<DraggableMarker
							key={index}
							positionProp={position}
							onChangePosition={handlerOnChangePosition}
						/>
					))}

					{routes.length > 0 ? (
						<Polyline positions={routes} color="blue" />
					) : null}

					<MapListener onClick={handlerOnClick} />
				</MapContainer>
			</div>
		</div>
	);
}
