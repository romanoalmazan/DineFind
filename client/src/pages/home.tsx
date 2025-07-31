import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, SearchSettings, SearchRestaurantsRequest } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  
  // Settings state
  const [settings, setSettings] = useState<SearchSettings>({
    radius: 2.0,
    distanceUnit: "miles",
    priceLevel: [1, 2, 3, 4],
    priceDisplayMode: "symbols",
    cuisines: [],
    openNow: true,
    highRating: false,
    location: { lat: 0, lng: 0 },
  });

  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);

  // Cuisine options
  const cuisineOptions = [
    { id: "italian", label: "Italian" },
    { id: "mexican", label: "Mexican" },
    { id: "asian", label: "Asian" },
    { id: "american", label: "American" },
    { id: "indian", label: "Indian" },
    { id: "mediterranean", label: "Mediterranean" },
  ];

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("restaurant-finder-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setSettings(prev => ({ ...prev, location }));
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  // Initialize Google Maps
  useEffect(() => {
    if (userLocation && !mapLoaded) {
      // Fetch API key from server
      fetch("/api/config")
        .then(res => res.json())
        .then(config => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&libraries=places`;
          script.async = true;
          script.onload = () => {
            setMapLoaded(true);
            initializeMap();
          };
          script.onerror = () => {
            console.error("Failed to load Google Maps API");
            toast({
              title: "Map Error",
              description: "Failed to load Google Maps. Please check your API key.",
              variant: "destructive",
            });
          };
          document.head.appendChild(script);
        })
        .catch(error => {
          console.error("Failed to fetch API configuration:", error);
          toast({
            title: "Configuration Error",
            description: "Failed to load API configuration.",
            variant: "destructive",
          });
        });
    }
  }, [userLocation, mapLoaded]);

  const initializeMap = () => {
    if (!userLocation) return;

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    const newMap = new (window as any).google.maps.Map(mapElement, {
      center: userLocation,
      zoom: 14,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Add user location marker
    new (window as any).google.maps.Marker({
      position: userLocation,
      map: newMap,
      title: "Your Location",
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    setMap(newMap);
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchSettings: SearchSettings) => {
      const request: SearchRestaurantsRequest = { settings: searchSettings };
      const response = await apiRequest("POST", "/api/restaurants/search", request);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Search Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data.restaurant) {
        toast({
          title: "No Results",
          description: "No restaurants found matching your criteria.",
        });
        return;
      }

      setCurrentRestaurant(data.restaurant);
      
      // Add restaurant marker to map
      if (map && data.restaurant) {
        // Clear existing restaurant markers
        // (In a full implementation, you'd track markers to remove them)
        
        const restaurantMarker = new (window as any).google.maps.Marker({
          position: data.restaurant.geometry.location,
          map: map,
          title: data.restaurant.name,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#EA4335",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 1.5,
          },
          animation: (window as any).google.maps.Animation.DROP,
        });

        // Center map between user and restaurant
        const bounds = new (window as any).google.maps.LatLngBounds();
        bounds.extend(userLocation!);
        bounds.extend(data.restaurant.geometry.location);
        map.fitBounds(bounds);
      }
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: "Failed to search for restaurants. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRandomize = () => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services to find restaurants near you.",
        variant: "destructive",
      });
      return;
    }

    searchMutation.mutate(settings);
  };

  const handleSettingsChange = (newSettings: Partial<SearchSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to localStorage (excluding location for privacy)
    const { location, ...settingsToSave } = updatedSettings;
    localStorage.setItem("restaurant-finder-settings", JSON.stringify(settingsToSave));
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return "Price not available";
    
    if (settings.priceDisplayMode === "symbols") {
      return "$".repeat(priceLevel);
    } else {
      const descriptions = {
        1: "Budget",
        2: "Moderate", 
        3: "Expensive",
        4: "Luxury"
      };
      return descriptions[priceLevel as keyof typeof descriptions] || "Unknown";
    }
  };

  const getDistanceFromUser = (restaurant: Restaurant) => {
    if (!userLocation) return "Distance unknown";
    
    const R = settings.distanceUnit === "miles" ? 3959 : 6371; // Earth's radius in miles or kilometers
    const dLat = (restaurant.geometry.location.lat - userLocation.lat) * Math.PI / 180;
    const dLon = (restaurant.geometry.location.lng - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(restaurant.geometry.location.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const unit = settings.distanceUnit === "miles" ? "mi" : "km";
    return `${distance.toFixed(1)} ${unit} away`;
  };

  const openDirections = () => {
    if (!currentRestaurant) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentRestaurant.geometry.location.lat},${currentRestaurant.geometry.location.lng}&destination_place_id=${currentRestaurant.place_id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <span className="text-google-blue text-2xl">🍽️</span>
            <h1 className="text-lg font-medium text-text-primary">Random Eats</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full hover:bg-gray-100"
          >
            <span className="text-text-secondary">⚙️</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pb-24">
        {/* Map Container */}
        <div className="h-1/2 relative overflow-hidden bg-gray-100">
          <div id="map" className="w-full h-full"></div>
          
          {/* Map loading placeholder */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue mx-auto mb-2"></div>
                <p className="text-text-secondary">Loading map...</p>
              </div>
            </div>
          )}
          
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 bg-white rounded shadow-lg">
            <button className="block p-3 hover:bg-gray-50 border-b border-gray-100">
              <span className="text-text-secondary">➕</span>
            </button>
            <button className="block p-3 hover:bg-gray-50">
              <span className="text-text-secondary">➖</span>
            </button>
          </div>
        </div>

        {/* Restaurant Result Card */}
        <div className="bg-white mx-4 -mt-6 rounded-2xl shadow-lg z-10 relative">
          <div className="p-6">
            {/* Loading State */}
            {searchMutation.isPending && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
                <p className="text-text-secondary mt-3">Finding your perfect restaurant...</p>
              </div>
            )}

            {/* Restaurant Details */}
            {!searchMutation.isPending && currentRestaurant && (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-medium text-text-primary mb-1">
                      {currentRestaurant.name}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      {currentRestaurant.rating && (
                        <div className="flex items-center">
                          <span className="text-google-yellow mr-1">⭐</span>
                          <span>{currentRestaurant.rating}</span>
                          {currentRestaurant.user_ratings_total && (
                            <span className="ml-1">({currentRestaurant.user_ratings_total})</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center">
                        <span>{getPriceDisplay(currentRestaurant.price_level)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                    <span className="text-text-secondary">🤍</span>
                  </Button>
                </div>

                <div className="space-y-3 mb-6">
                  {currentRestaurant.types && (
                    <div className="flex items-center text-sm text-text-secondary">
                      <span className="mr-3">🍽️</span>
                      <span>{currentRestaurant.types[0]?.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {currentRestaurant.formatted_address && (
                    <div className="flex items-center text-sm text-text-secondary">
                      <span className="mr-3">📍</span>
                      <span>{currentRestaurant.formatted_address}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-text-secondary">
                    <span className="mr-3">🚶</span>
                    <span>{getDistanceFromUser(currentRestaurant)}</span>
                  </div>
                  {currentRestaurant.opening_hours?.open_now !== undefined && (
                    <div className="flex items-center text-sm text-text-secondary">
                      <span className="mr-3">🕒</span>
                      <span className={currentRestaurant.opening_hours.open_now ? "text-google-green" : "text-google-red"}>
                        {currentRestaurant.opening_hours.open_now ? "Open now" : "Closed"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button 
                    onClick={openDirections}
                    className="flex-1 bg-google-blue text-white hover:bg-blue-600"
                  >
                    <span className="mr-2">🧭</span>
                    Directions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-gray-300 text-text-primary hover:bg-gray-50"
                  >
                    <span className="mr-2">ℹ️</span>
                    Details
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!searchMutation.isPending && !currentRestaurant && (
              <div className="text-center py-8">
                <span className="text-6xl text-gray-300 mb-4 block">🍽️</span>
                <h3 className="text-lg font-medium text-text-primary mb-2">Ready to discover?</h3>
                <p className="text-text-secondary">Tap the magic wand below to find a random restaurant near you!</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={handleRandomize}
            disabled={searchMutation.isPending || !userLocation}
            className="bg-google-red text-white p-4 rounded-full hover:bg-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
            size="icon"
          >
            <span className="text-2xl">🎲</span>
          </Button>
        </div>
      </main>

      {/* Settings Bottom Sheet */}
      <BottomSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="px-6 pb-6">
          <h2 className="text-xl font-medium text-text-primary mb-6">Search Settings</h2>

          {/* Units Preferences */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-3">Units & Display</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-2">Distance Unit</label>
                <Select 
                  value={settings.distanceUnit} 
                  onValueChange={(value) => handleSettingsChange({ distanceUnit: value as "miles" | "kilometers" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="miles">Miles</SelectItem>
                    <SelectItem value="kilometers">Kilometers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-2">Price Display</label>
                <Select 
                  value={settings.priceDisplayMode} 
                  onValueChange={(value) => handleSettingsChange({ priceDisplayMode: value as "symbols" | "descriptive" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="symbols">$ Symbols</SelectItem>
                    <SelectItem value="descriptive">Descriptive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Distance Radius */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-3">Search Radius</label>
            <div className="relative">
              <Slider
                value={[settings.radius]}
                onValueChange={(value) => handleSettingsChange({ radius: value[0] })}
                min={0.5}
                max={10}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-text-secondary mt-2">
                <span>0.5 {settings.distanceUnit === "miles" ? "mi" : "km"}</span>
                <span className="font-medium text-google-blue">
                  {settings.radius.toFixed(1)} {settings.distanceUnit === "miles" ? "mi" : "km"}
                </span>
                <span>10 {settings.distanceUnit === "miles" ? "mi" : "km"}</span>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-3">Price Range</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((price) => (
                <Button
                  key={price}
                  variant={settings.priceLevel.includes(price) ? "default" : "outline"}
                  className={`flex-1 py-3 px-4 ${
                    settings.priceLevel.includes(price) 
                      ? "bg-google-blue border-google-blue" 
                      : "border-gray-200"
                  }`}
                  onClick={() => {
                    const newPriceLevel = settings.priceLevel.includes(price)
                      ? settings.priceLevel.filter(p => p !== price)
                      : [...settings.priceLevel, price];
                    handleSettingsChange({ priceLevel: newPriceLevel });
                  }}
                >
                  <div className="text-center">
                    <div className="text-lg">{"$".repeat(price)}</div>
                    <div className="text-xs">
                      {price === 1 && "Budget"}
                      {price === 2 && "Moderate"}
                      {price === 3 && "Expensive"}
                      {price === 4 && "Luxury"}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Cuisine Types */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-3">Cuisine Preferences</label>
            <div className="grid grid-cols-2 gap-3">
              {cuisineOptions.map((cuisine) => (
                <div
                  key={cuisine.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    const newCuisines = settings.cuisines.includes(cuisine.id)
                      ? settings.cuisines.filter(c => c !== cuisine.id)
                      : [...settings.cuisines, cuisine.id];
                    handleSettingsChange({ cuisines: newCuisines });
                  }}
                >
                  <Checkbox
                    checked={settings.cuisines.includes(cuisine.id)}
                    className="mr-3 text-google-blue"
                  />
                  <span className="text-sm">{cuisine.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-3">Additional Filters</label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Open now only</span>
                <Switch
                  checked={settings.openNow}
                  onCheckedChange={(checked) => handleSettingsChange({ openNow: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Highly rated (4+ stars)</span>
                <Switch
                  checked={settings.highRating}
                  onCheckedChange={(checked) => handleSettingsChange({ highRating: checked })}
                />
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <Button
            onClick={() => setIsSettingsOpen(false)}
            className="w-full bg-google-blue text-white hover:bg-blue-600"
          >
            Apply Settings
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
