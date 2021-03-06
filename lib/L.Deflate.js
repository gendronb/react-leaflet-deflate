"use strict";

L.Deflate = L.FeatureGroup.extend({ options: { minSize: 10, markerCluster: false, markerOptions: {}, markerClusterOptions: {} }, initialize: function initialize(options) {
    L.Util.setOptions(this, options);this._allLayers = [];L.FeatureGroup.prototype.initialize.call(this, [], options);if (options.markerCluster) {
      this.clusterLayer = L.markerClusterGroup(this.options.markerClusterOptions);
    }
  }, _getBounds: function _getBounds(path) {
    if (path instanceof L.Circle) {
      path.addTo(this._map);var bounds = path.getBounds();this._map.removeLayer(path);return bounds;
    }return path.getBounds();
  }, _isCollapsed: function _isCollapsed(path, zoom) {
    var bounds = path.computedBounds;var ne_px = this._map.project(bounds.getNorthEast(), zoom);var sw_px = this._map.project(bounds.getSouthWest(), zoom);var width = ne_px.x - sw_px.x;var height = sw_px.y - ne_px.y;return height < this.options.minSize || width < this.options.minSize;
  }, _getZoomThreshold: function _getZoomThreshold(path) {
    var zoomThreshold = null;var zoom = this._map.getZoom();if (this._isCollapsed(path, this._map.getZoom())) {
      while (!zoomThreshold) {
        zoom += 1;if (!this._isCollapsed(path, zoom)) {
          zoomThreshold = zoom - 1;
        }
      }
    } else {
      while (!zoomThreshold) {
        zoom -= 1;if (this._isCollapsed(path, zoom)) {
          zoomThreshold = zoom;
        }
      }
    }return zoomThreshold;
  }, _bindInfoTools: function _bindInfoTools(marker, parentLayer) {
    if (parentLayer._popupHandlersAdded) {
      marker.bindPopup(parentLayer._popup._content, parentLayer._popup.options);
    }if (parentLayer._tooltipHandlersAdded) {
      marker.bindTooltip(parentLayer._tooltip._content, parentLayer._tooltip.options);
    }
  }, _bindEvents: function _bindEvents(marker, parentLayer) {
    this._bindInfoTools(marker, parentLayer);var events = parentLayer._events;for (var event in events) {
      if (events.hasOwnProperty(event)) {
        var listeners = events[event];for (var i = 0, len = listeners.length; i < len; i++) {
          marker.on(event, listeners[i].fn);
        }
      }
    }if (!parentLayer._eventParents) {
      return;
    }for (var key in parentLayer._eventParents) {
      if (parentLayer._eventParents.hasOwnProperty(key)) {
        if (parentLayer._eventParents[key]._map) {
          continue;
        }this._bindEvents(marker, parentLayer._eventParents[key]);this._bindInfoTools(parentLayer, parentLayer._eventParents[key]);
      }
    }
  }, _makeMarker: function _makeMarker(layer) {
    var markerOptions;if (typeof this.options.markerOptions === "function") {
      markerOptions = this.options.markerOptions(layer);
    } else {
      markerOptions = this.options.markerOptions;
    }var marker = L.marker(layer.computedBounds.getCenter(), markerOptions);this._bindEvents(marker, layer);if (layer.feature) {
      var markerFeature = marker.toGeoJSON();markerFeature.properties = layer.feature.properties;marker.feature = markerFeature;
    }return marker;
  }, addLayer: function addLayer(layer) {
    if (layer instanceof L.FeatureGroup) {
      for (var i in layer._layers) {
        this.addLayer(layer._layers[i]);
      }
    } else {
      var layerToAdd = layer;if (layer.getBounds && !layer.zoomThreshold && !layer.marker) {
        layer.computedBounds = this._getBounds(layer);var zoomThreshold = this._getZoomThreshold(layer);layer.zoomThreshold = zoomThreshold;layer.marker = this._makeMarker(layer);layer.zoomState = this._map.getZoom();if (this._map.getZoom() <= zoomThreshold) {
          layerToAdd = layer.marker;
        }this._allLayers.push(layer);
      }if (this.clusterLayer) {
        this.clusterLayer.addLayer(layerToAdd);
      } else {
        L.FeatureGroup.prototype.addLayer.call(this, layerToAdd);
      }
    }
  }, removeLayer: function removeLayer(layer) {
    if (layer instanceof L.FeatureGroup) {
      for (var i in layer._layers) {
        this.removeLayer(layer._layers[i]);
      }
    } else {
      var markerLayer = this.clusterLayer ? this.clusterLayer : this._map;markerLayer.removeLayer(layer);if (layer.marker) {
        markerLayer.removeLayer(layer.marker);
      }var index = this._allLayers.indexOf(layer);if (index !== -1) {
        this._allLayers.splice(index, 1);
      }
    }
  }, clearLayers: function clearLayers() {
    if (this.clusterLayer) {
      this.clusterLayer.clearLayers();this._allLayers = [];
    } else {
      L.FeatureGroup.prototype.clearLayers.call(this);
    }
  }, _switchDisplay: function _switchDisplay(layer, showMarker) {
    var markerLayer = this.clusterLayer ? this.clusterLayer : this._map;if (showMarker) {
      markerLayer.addLayer(layer.marker);markerLayer.removeLayer(layer);
    } else {
      markerLayer.addLayer(layer);markerLayer.removeLayer(layer.marker);
    }
  }, _deflate: function _deflate() {
    var bounds = this._map.getBounds();var endZoom = this._map.getZoom();for (var i = 0, len = this._allLayers.length; i < len; i++) {
      if (this._allLayers[i].marker && this._allLayers[i].zoomState !== endZoom && this._allLayers[i].computedBounds.intersects(bounds)) {
        this._switchDisplay(this._allLayers[i], endZoom <= this._allLayers[i].zoomThreshold);this._allLayers[i].zoomState = endZoom;
      }
    }
  }, onAdd: function onAdd(map) {
    if (this.clusterLayer) {
      this.clusterLayer.addTo(map);
    }this._map.on("zoomend", this._deflate, this);this._map.on("moveend", this._deflate, this);
  }, onRemove: function onRemove(map) {
    if (this.clusterLayer) {
      map.removeLayer(this.cluster);
    }this._map.off("zoomend", this._deflate, this);this._map.off("moveend", this._deflate, this);
  } });L.deflate = function (options) {
  return new L.Deflate(options);
};