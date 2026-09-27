import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MapView from './MapView.vue'
import maplibregl from 'maplibre-gl'

//mock
const mockSetLayoutProperty = vi.fn()
const mockGetLayer = vi.fn().mockReturnValue(true)
const mockAddControl = vi.fn()
const mockSetLngLat = vi.fn().mockReturnThis()
const mockAddTo = vi.fn().mockReturnThis()
const mockTile = vi.fn()

//Replacing original libraries with fake ones
vi.mock('maplibre-gl', () => {
  return {
    default: {
      Map: vi.fn().mockImplementation(function() {
        return {
          addControl: mockAddControl,
          setLayoutProperty: mockSetLayoutProperty,
          getLayer: mockGetLayer
        }
      }),
      NavigationControl: vi.fn().mockImplementation(function() {
        return {}
      }),
      Marker: vi.fn().mockImplementation(function() {
        return {
          setLngLat: mockSetLngLat,
          addTo: mockAddTo
        }
      }),
      addProtocol: vi.fn(),
      setRTLTextPlugin: vi.fn()
    }
  }
})


vi.mock('pmtiles', () => {
  return {
    Protocol: vi.fn().mockImplementation(function() {
      return {
        tile: mockTile
      }
    })
  }
})
//Start writing tests
describe('MapView.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLayer.mockReturnValue(true) 
    wrapper = mount(MapView)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })
//Tests
  it('TC 1: Mounts successfully and renders main DOM structure', () => {
    const container = wrapper.find('[data-test="map-container"]')
    const mapDiv = wrapper.find('#map')
    
    expect(container.exists()).toBe(true)
    expect(mapDiv.exists()).toBe(true)
    expect(wrapper.text()).toContain('Map Layers')
  })

  it('TC 2: Assigns default empty array to markers prop', () => {
    expect(wrapper.props('markers')).toEqual([])
  })

  it('TC 3: Registers PMTiles protocol on mount', () => {
    expect(maplibregl.addProtocol).toHaveBeenCalledTimes(1)
    expect(maplibregl.addProtocol).toHaveBeenCalledWith('pmtiles', mockTile)
  })

  it('TC 4: Instantiates map with correct default configuration', () => {
    expect(maplibregl.Map).toHaveBeenCalledTimes(1)
    expect(maplibregl.Map).toHaveBeenCalledWith({
      container: 'map',
      center: [51.395, 35.715],
      zoom: 12,
      minZoom: 10.5,
      maxZoom: 16,
      style: '/style.json'
    })
  })

  it('TC 5: Configures RTL Text Plugin correctly', () => {
    expect(maplibregl.setRTLTextPlugin).toHaveBeenCalledTimes(1)
    expect(maplibregl.setRTLTextPlugin).toHaveBeenCalledWith('/plugins/mapbox-gl-rtl-text.js', true)
  })

  it('TC 6: Adds NavigationControl to the map', () => {
    expect(maplibregl.NavigationControl).toHaveBeenCalledTimes(1)
    expect(mockAddControl).toHaveBeenCalledTimes(1)
    const mockNavInstance = vi.mocked(maplibregl.NavigationControl).mock.results[0].value
    expect(mockAddControl).toHaveBeenCalledWith(mockNavInstance, 'bottom-left')
  })

  it('TC 7: Renders markers passed via props correctly', () => {
    const markersData = [
      { id: '1', lat: 35.7, lng: 51.4, type: 'hospital' },
      { id: '2', lat: 35.8, lng: 51.5 }
    ]
    
    const customWrapper = mount(MapView, {
      props: { markers: markersData as any }
    })

    expect(maplibregl.Marker).toHaveBeenCalledTimes(2)
    expect(mockSetLngLat).toHaveBeenCalledTimes(2)
    expect(mockAddTo).toHaveBeenCalledTimes(2)
    expect(mockSetLngLat).toHaveBeenNthCalledWith(1, [51.4, 35.7])
    
    customWrapper.unmount()
  })

  it('TC 8: Applies fallback "gas" icon when marker type is omitted', () => {
    const markersData = [{ id: '1', lat: 35.7, lng: 51.4 }]
    const customWrapper = mount(MapView, { props: { markers: markersData as any } })

    const el = vi.mocked(maplibregl.Marker).mock.calls[0][0] as HTMLElement
    expect(el.style.backgroundImage).toContain('gas.png')
    
    customWrapper.unmount()
  })

  it('TC 9: Initializes UI layer checkboxes in checked state', () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    
    expect(checkboxes).toHaveLength(4)
    checkboxes.forEach(cb => {
      expect((cb.element as HTMLInputElement).checked).toBe(true)
    })
    
    const vm = wrapper.vm as any
    expect(vm.layersVisibility).toEqual({
      land: true,
      streets: true,
      streetNames: true,
      water: true
    })
  })

  it('TC 10: Updates reactive state when layer checkbox is toggled', async () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const streetsCheckbox = checkboxes[1] 
    
    await streetsCheckbox.trigger('change')
    
    const vm = wrapper.vm as any
    expect(vm.layersVisibility.streets).toBe(false)
    expect((streetsCheckbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('TC 11: Calls map.setLayoutProperty with "none" when layer is unchecked', async () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const streetsCheckbox = checkboxes[1]
    
    await streetsCheckbox.trigger('change')
    
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('streets', 'visibility', 'none')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('street-polygons', 'visibility', 'none')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('bridges', 'visibility', 'none')
  })

  it('TC 12: Handles missing layers gracefully without crashing', async () => {
    mockGetLayer.mockImplementation((layerId: string) => {
      if (layerId === 'street-polygons') return false
      return true
    })

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const streetsCheckbox = checkboxes[1]
    
    await streetsCheckbox.trigger('change')
    
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('streets', 'visibility', 'none')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('bridges', 'visibility', 'none')
    expect(mockSetLayoutProperty).not.toHaveBeenCalledWith('street-polygons', 'visibility', 'none')
  })

  it('TC 13: Applies correct Tailwind CSS classes to main elements', () => {
    const container = wrapper.find('[data-test="map-container"]')
    const layersPanel = wrapper.find('.absolute')
    
    expect(container.classes()).toContain('h-screen')
    expect(container.classes()).toContain('w-full')
    expect(container.classes()).toContain('relative')
    
    expect(layersPanel.classes()).toContain('absolute')
    expect(layersPanel.classes()).toContain('z-10')
    expect(layersPanel.classes()).toContain('backdrop-blur-sm')
  })
})