// classes/ProjectFormData.js

/**
 * ProjectFormData: Manages the volatile state of the 4-step project configuration process.
 * FIXED: Proper user removal handling and subscription cleanup
 */
export class ProjectFormData {
    projectName = '';
    description = '';
    auxDataDrafts = [];

    users = []; // Array of {userId: string, roles: number[]}
    aoiDrafts = [];
    subscriptions = [];

    isUpdateMode = false;
    currentStep = 1;
    projectIdToUpdate = null;

    constructor(isUpdate = false, projectId = null) {
        this.isUpdateMode = isUpdate;
        this.projectIdToUpdate = projectId;
        this.users = [];
    }

    nextStep() {
        if (this.currentStep < 4) {
            this.currentStep++;
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }

    addAOIDraft(aoi) {
        this.aoiDrafts.push(aoi);
    }

    /**
     * CRITICAL: Remove user from project AND clean up their subscriptions
     */
    removeUser(userId) {
        // Remove from users array
        this.users = this.users.filter(u => {
            const uId = typeof u === 'object' ? u.userId : u;
            return uId !== userId;
        });

        // Remove user from all subscriptions
        this.subscriptions.forEach(sub => {
            if (sub.userIds && sub.userIds.includes(userId)) {
                sub.userIds = sub.userIds.filter(id => id !== userId);
            }
        });

        // Remove subscriptions that have no users left
        this.subscriptions = this.subscriptions.filter(sub => {
            // Keep subscriptions with users OR subscriptions marked for deletion (status=2)
            return (sub.userIds && sub.userIds.length > 0) || sub.status === 2;
        });

        console.log(`[ProjectFormData] User ${userId} removed from project and all subscriptions`);
    }

    getFinalAuxData() {
        const finalAuxData = {};
        this.auxDataDrafts.forEach(item => {
            if (item.key && item.value) {
                try {
                    finalAuxData[item.key] = JSON.parse(item.value);
                } catch {
                    finalAuxData[item.key] = item.value;
                }
            }
        });
        return finalAuxData;
    }

    /**
     * Get the correct aoiId for a given clientAoiId
     */
    getAoiIdForClient(clientAoiId) {
        const aoi = this.aoiDrafts.find(a => a.clientAoiId === clientAoiId);
        if (!aoi) return null;
        
        return aoi.aoiId || `aoi_${clientAoiId}`;
    }

    /**
     * Adds or updates a subscription
     */
    addOrUpdateSubscription(clientAoiId, channelId, userIds, subscriptionId = null) {
        const aoiId = this.getAoiIdForClient(clientAoiId);
        
        if (!aoiId) {
            console.error(`Cannot create subscription: AOI with clientAoiId ${clientAoiId} not found`);
            return;
        }

        let existingIndex = -1;
        
        if (subscriptionId) {
            existingIndex = this.subscriptions.findIndex(s => s.subscriptionId === subscriptionId);
        } else {
            const userIdsStr = JSON.stringify([...userIds].sort());
            existingIndex = this.subscriptions.findIndex(s => 
                s.aoiId === aoiId && 
                s.channelId === channelId &&
                JSON.stringify([...s.userIds].sort()) === userIdsStr &&
                s.status !== 2
            );
        }

        const subscription = {
            aoiId,
            clientAoiId,
            channelId,
            userIds: [...userIds],
            subscriptionId,
            status: 1,
            alertDisseminationMode: ['notify'],
            auxData: null
        };

        if (existingIndex >= 0) {
            this.subscriptions[existingIndex] = subscription;
        } else {
            this.subscriptions.push(subscription);
        }
    }

    /**
     * Toggle subscription status between active (1) and inactive (0)
     */
    toggleSubscriptionStatus(subscription) {
        const index = this.subscriptions.findIndex(
            s => s.clientAoiId === subscription.clientAoiId && 
                 s.channelId === subscription.channelId && 
                 s.subscriptionId === subscription.subscriptionId
        );

        if (index === -1) {
            console.warn('Subscription not found for toggle:', subscription);
            return;
        }

        // Toggle between active (1) and inactive (0)
        this.subscriptions[index].status = this.subscriptions[index].status === 1 ? 0 : 1;
    }

    /**
     * Soft deletes a subscription (marks as deleted with status 2)
     */
    softDeleteSubscription(subscription) {
        const index = this.subscriptions.findIndex(
            s => s.clientAoiId === subscription.clientAoiId && 
                 s.channelId === subscription.channelId && 
                 s.subscriptionId === subscription.subscriptionId &&
                 s.status !== 2
        );

        if (index === -1) {
            console.warn('Subscription not found for soft deletion:', subscription);
            return;
        }

        if (this.subscriptions[index].subscriptionId) {
            // Has DB ID - mark as deleted
            this.subscriptions[index].status = 2;
        } else {
            // No DB ID - remove from array
            this.subscriptions.splice(index, 1);
        }
    }

    /**
     * Hard removes a subscription (status=2) - DEPRECATED, use softDeleteSubscription
     */
    hardRemoveSubscription(clientAoiIdOrSubscription, channelId = null) {
        this.softDeleteSubscription(
            typeof clientAoiIdOrSubscription === 'object' 
                ? clientAoiIdOrSubscription 
                : this.subscriptions.find(s => 
                    (s.aoiId === clientAoiIdOrSubscription || s.clientAoiId === clientAoiIdOrSubscription) 
                    && s.channelId === channelId
                )
        );
    }

    /**
     * Gets subscriptions for a specific AOI
     */
    getSubscriptionsForAoi(clientAoiId, includeSoftDeleted = false) {
        if (includeSoftDeleted) {
            return this.subscriptions.filter(
                s => s.clientAoiId === clientAoiId && s.status !== 2
            );
        }
        return this.subscriptions.filter(
            s => s.clientAoiId === clientAoiId && s.status === 1
        );
    }

    /**
     * Check if an AOI has at least one active subscription
     */
    aoiHasSubscription(clientAoiId) {
        return this.subscriptions.some(
            s => s.clientAoiId === clientAoiId && s.status === 1
        );
    }

    /**
     * Removes a subscription - DEPRECATED, use softDeleteSubscription
     */
    removeSubscription(clientAoiIdOrSubscription, channelId = null) {
        this.softDeleteSubscription(
            typeof clientAoiIdOrSubscription === 'object'
                ? clientAoiIdOrSubscription
                : this.subscriptions.find(s =>
                    (s.aoiId === clientAoiIdOrSubscription || s.clientAoiId === clientAoiIdOrSubscription)
                    && s.channelId === channelId
                )
        );
    }

    /**
     * Converts to backend bundle format with proper user/role structure
     */
    toBackendBundle() {
        const finalAuxData = this.getFinalAuxData();
        
        return {
            projectBasicInfo: {
                projectName: this.projectName,
                description: this.description,
                auxData: Object.keys(finalAuxData).length > 0 ? finalAuxData : null,
            },
            userData: this.users.map(user => {
                if (typeof user === 'object' && user.userId) {
                    return {
                        userId: user.userId,
                        roles: user.roles || []
                    };
                }
                return {
                    userId: user,
                    roles: []
                };
            }),
            aoiData: this.aoiDrafts.map(draft => {
                const aoiData = draft.toBackendData();
                if (!aoiData.aoiId) {
                    aoiData.aoiId = `aoi_${draft.clientAoiId}`;
                }
                return aoiData;
            }),
            // CRITICAL: Only send subscriptions that aren't deleted (status != 2)
            subscriptionData: this.subscriptions
                .filter(sub => sub.status !== 2 || sub.subscriptionId) // Include deleted if has DB ID
                .map(sub => ({
                    aoiId: sub.aoiId,
                    channelId: sub.channelId,
                    userIds: sub.userIds,
                    alertDisseminationMode: sub.alertDisseminationMode,
                    auxData: sub.auxData,
                    status: sub.status,
                    subscriptionId: sub.subscriptionId
                }))
        };
    }

    reset() {
        this.projectName = '';
        this.description = '';
        this.auxDataDrafts = [];
        this.users = [];
        this.aoiDrafts = [];
        this.subscriptions = [];
        this.isUpdateMode = false;
        this.currentStep = 1;
        this.projectIdToUpdate = null;
    }
}