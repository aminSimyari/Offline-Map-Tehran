<script setup lang="ts">
import { onMounted, ref } from 'vue'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'

type PoiType = 'hospital' | 'subway' | 'gas'

// Exported so test files (and parent components) can import and reuse this type
export interface MapMarker {
  id: string | number   // mandatory unique identifier
  lat: number            // mandatory latitude
  lng: number             // mandatory longitude
  type?: PoiType          // optional, defaults to 'gas' icon if omitted
}

const props = withDefaults(
  defineProps<{
    markers?: MapMarker[]
  }>(),
  {
    markers: () => []
  }
)

let map: maplibregl.Map | null = null

// layer visibility state
const layersVisibility = ref({
  land: true,
  streets: true,
  streetNames: true,
  water: true
})

type LayerKey = keyof typeof layersVisibility.value

onMounted(() => {
  // Set PMTiles protocol
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)

  // RTL text plugin
  maplibregl.setRTLTextPlugin(
    '/plugins/mapbox-gl-rtl-text.js',
    true
  )

  // MapLibre
  map = new maplibregl.Map({
    container: 'map',
    center: [51.395, 35.715],
    zoom: 12,
    minZoom: 10.5,
    maxZoom: 16,
    style: '/style.json'
  })

  // zoom and pan controls
  map.addControl(new maplibregl.NavigationControl(), 'bottom-left')

  // Render HTML markers from props
  props.markers.forEach((marker: MapMarker) => {
    const el = document.createElement('div')
    const iconType: PoiType = marker.type ?? 'gas'

    el.style.backgroundImage = `url('/icons/${iconType}.png')`
    el.style.width = '28px'
    el.style.height = '28px'
    el.style.backgroundSize = 'contain'
    el.style.backgroundRepeat = 'no-repeat'

    if (map) {
      new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map)
    }
  })
})

// Toggle visibility of layers
const toggleLayer = (layerKey: LayerKey, layersArray: string[]) => {
  if (!map) return

  layersVisibility.value[layerKey] = !layersVisibility.value[layerKey]
  const visibilityString = layersVisibility.value[layerKey] ? 'visible' : 'none'

  layersArray.forEach((layerId: string) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibilityString)
    }
  })
}
</script>

<template>
  <div data-test="map-container" class="relative w-full h-screen rounded-lg shadow-lg">
    <div id="map" data-test="map-element" class="w-full h-screen"></div>

    <div class="absolute top-4 right-4 z-10 bg-gray-900/95 text-white p-4 rounded-lg shadow-xl border border-gray-700 w-48 backdrop-blur-sm">
      <h3 class="font-bold text-sm mb-3 tracking-wide text-gray-300 uppercase border-b border-gray-700 pb-1.5">
        Map Layers
      </h3>

      <div class="flex flex-col space-y-2.5 text-sm">
        <label class="flex items-center space-x-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            :checked="layersVisibility.land"
            @change="toggleLayer('land', ['land'])"
            class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <span class="group-hover:text-blue-400 transition-colors">Land</span>
        </label>

        <label class="flex items-center space-x-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            :checked="layersVisibility.streets"
            @change="toggleLayer('streets', ['streets', 'street-polygons', 'bridges'])"
            class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <span class="group-hover:text-blue-400 transition-colors">Streets</span>
        </label>

        <label class="flex items-center space-x-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            :checked="layersVisibility.streetNames"
            @change="toggleLayer('streetNames', ['street-labels', 'place-labels'])"
            class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <span class="group-hover:text-blue-400 transition-colors">Names</span>
        </label>

        <label class="flex items-center space-x-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            :checked="layersVisibility.water"
            @change="toggleLayer('water', ['water', 'water-lines', 'ocean'])"
            class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <span class="group-hover:text-blue-400 transition-colors">Water</span>
        </label>
      </div>
    </div>
  </div>
</template>