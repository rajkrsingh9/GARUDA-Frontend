<!-- GARUDA-Frontend/src/views/MonitorMapView.vue -->

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiClient } from '@/api/ApiClient.js';
import MapVisualization from '@/components/map/MapVisualization.vue';
import AoiVizPanel from '@/components/map/AoiVizPanel.vue';

const props = defineProps({
  id: String,
});

const router = useRouter();
const apiClient = ApiClient.getInstance();

const isLoading = ref(true);
const project = ref(null);
const projectAlerts = ref([]);
const alertFeatures = ref([]);
const showVizPanel = ref(false);
const activeAoiDetails = ref(null); // Single clicked AOI
const mapKey = ref(0);
const alertTimeRange = ref({ from: null, to: null });

onMounted(async () => {
  try {
    const data = await apiClient.getProjectDetails(parseInt(props.id));
    project.value = data;
    console.log('[MonitorMapView] Project loaded:', data);
  } catch (error) {
    console.error("Error loading project for monitoring:", error);
    router.push('/');
  } finally {
    isLoading.value = false;
  }
});

const handleAoiClick = async (aoi) => {
  console.log('[MonitorMapView] AOI clicked:', aoi);
  activeAoiDetails.value = aoi;
  showVizPanel.value = true;
  await fetchAlertsForAoi(aoi.aoi_id);
};

const closeVizPanel = () => {
  showVizPanel.value = false;
  activeAoiDetails.value = null;
  projectAlerts.value = [];
  alertTimeRange.value = { from: null, to: null };
  alertFeatures.value = [];
  mapKey.value++;
};


const fetchAlertsForAoi = async (aoiId) => {
  try {
    console.log('[MonitorMapView] Fetching alerts for AOI:', aoiId, 'Project:', project.value.id);
    
    const { alerts, timeRange } = await apiClient.getProjectAlerts(project.value.id, aoiId);
    
    console.log('[MonitorMapView] Raw alerts received:', alerts);
    console.log('[MonitorMapView] Alert count:', alerts.length);
    
    // Store all alerts
    projectAlerts.value = alerts;
    alertTimeRange.value = timeRange;
   
    // Extract and validate feature GeoJSON
    alertFeatures.value = alerts
        .map((alert, idx) => {
            const geojson = alert.featureGeoJson;
            
            // Debug each alert
            console.log(`[MonitorMapView] Alert ${idx + 1}:`, {
                id: alert.id,
                hasFeature: !!geojson,
                featureType: geojson?.type,
                message: alert.message
            });
            
            return geojson;
        })
        .filter(geojson => {
            // Only keep valid GeoJSON
            const isValid = geojson && 
                           (geojson.type === 'Feature' || 
                            geojson.type === 'FeatureCollection' ||
                            (geojson.type && geojson.coordinates));
            
            if (geojson && !isValid) {
                console.warn('[MonitorMapView] Invalid GeoJSON structure:', geojson);
            }
            
            return isValid;
        });

    console.log('[MonitorMapView] Valid alert features:', alertFeatures.value.length);
    console.log('[MonitorMapView] Features to display:', alertFeatures.value);
    
    
  } catch (e) {
    console.error("[MonitorMapView] Failed to load alerts:", e);
    console.error("Error details:", e.response?.data || e.message);
  }
};



</script>

<template>
  <div class="monitor-map-view h-[85vh] flex flex-col">

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-grow flex items-center justify-center text-white">
      Loading Monitor Data...
    </div>

    <!-- Main Content -->
    <div v-else-if="project" class="flex-grow h-[80vh] mt-[1.4vh] relative min-h-0">

      
      <div class="h-full inset-0">
        <MapVisualization :key="mapKey" :aois-to-display="project.aois" :is-monitor-mode="true"
          @aoi-clicked="handleAoiClick" :alert-features-to-display="alertFeatures" />
      </div>

      <!-- FIXED: Pass selected-aoi instead of all-aois -->
      <AoiVizPanel :is-visible="showVizPanel" :project-id="project.id" :selected-aoi="activeAoiDetails"
        :project-alerts="projectAlerts" :alert-time-range="alertTimeRange" @close="closeVizPanel" />
    </div>

    <!-- Error State -->
    <div v-else class="flex-grow flex items-center justify-center text-red-400">
      Project not found.
    </div>
  </div>
</template>

<style scoped>
.monitor-map-view {
  background-color: #111827;
}
</style>