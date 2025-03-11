'use strict'

const loggerService = require('./logger.service')

/**
 * Service for application lifecycle management
 */
const lifecycleService = {
    /**
     * Current application state
     * Possible values: running, paused, shutting_down
     */
    state: 'running',

    /**
     * Map of registered background tasks
     */
    backgroundTasks: new Map(),

    /**
     * Register a background task
     * @param {string} id - Task identifier
     * @param {Object} task - Task object with start/stop methods
     * @returns {boolean} Success status
     */
    registerTask(id, task) {
        if (this.backgroundTasks.has(id)) {
            return false
        }

        this.backgroundTasks.set(id, {
            id,
            task,
            running: false
        })

        return true
    },

    /**
     * Start a registered background task
     * @param {string} id - Task identifier
     * @returns {Promise<boolean>} Success status
     */
    async startTask(id) {
        const taskInfo = this.backgroundTasks.get(id)

        if (!taskInfo) {
            return false
        }

        if (taskInfo.running) {
            return true // Already running
        }

        try {
            await taskInfo.task.start()
            taskInfo.running = true
            return true
        } catch (error) {
            loggerService.error(`Failed to start task ${id}`, error)
            return false
        }
    },

    /**
     * Stop a registered background task
     * @param {string} id - Task identifier
     * @returns {Promise<boolean>} Success status
     */
    async stopTask(id) {
        const taskInfo = this.backgroundTasks.get(id)

        if (!taskInfo || !taskInfo.running) {
            return false
        }

        try {
            await taskInfo.task.stop()
            taskInfo.running = false
            return true
        } catch (error) {
            loggerService.error(`Failed to stop task ${id}`, error)
            return false
        }
    },

    /**
     * Restart the application
     * @returns {Promise<void>}
     */
    async restart() {
        loggerService.info('Restarting application...')

        // In a real implementation, this would vary based on deployment environment
        // For example, in a containerized environment, you might exit and let
        // the container orchestrator restart the container

        try {
            await this.shutdown()

            // Exit with code 0 to signal clean restart
            setTimeout(() => {
                process.exit(0)
            }, 1000)
        } catch (error) {
            loggerService.error('Error during restart', error)
            throw error
        }
    },

    /**
     * Pause all background processing
     * @returns {Promise<Object>} Operation result
     */
    async pause() {
        if (this.state === 'paused') {
            return {
                success: true,
                message: 'System is already paused',
                state: this.state
            }
        }

        try {
            loggerService.info('Pausing application...')

            // Stop all running background tasks
            const results = []

            for (const [id, taskInfo] of this.backgroundTasks.entries()) {
                if (taskInfo.running) {
                    const success = await this.stopTask(id)
                    results.push({ id, success })
                }
            }

            this.state = 'paused'

            return {
                success: true,
                message: 'System successfully paused',
                state: this.state,
                tasks: results
            }
        } catch (error) {
            loggerService.error('Error during pause operation', error)
            return {
                success: false,
                message: `Failed to pause system: ${error.message}`,
                state: this.state
            }
        }
    },

    /**
     * Resume all background processing
     * @returns {Promise<Object>} Operation result
     */
    async resume() {
        if (this.state !== 'paused') {
            return {
                success: true,
                message: 'System is not paused',
                state: this.state
            }
        }

        try {
            loggerService.info('Resuming application...')

            // Start all registered background tasks
            const results = []

            for (const [id, taskInfo] of this.backgroundTasks.entries()) {
                if (!taskInfo.running) {
                    const success = await this.startTask(id)
                    results.push({ id, success })
                }
            }

            this.state = 'running'

            return {
                success: true,
                message: 'System successfully resumed',
                state: this.state,
                tasks: results
            }
        } catch (error) {
            loggerService.error('Error during resume operation', error)
            return {
                success: false,
                message: `Failed to resume system: ${error.message}`,
                state: this.state
            }
        }
    },

    /**
     * Gracefully shut down the application
     * @returns {Promise<void>}
     */
    async shutdown() {
        try {
            loggerService.info('Shutting down application...')
            this.state = 'shutting_down'

            // Stop all background tasks
            for (const [id, taskInfo] of this.backgroundTasks.entries()) {
                if (taskInfo.running) {
                    await this.stopTask(id)
                }
            }

            // Perform any other cleanup
            // ...

            loggerService.info('Shutdown complete')
        } catch (error) {
            loggerService.error('Error during shutdown', error)
            throw error
        }
    },

    /**
     * Get current system state
     * @returns {Object} System state information
     */
    getState() {
        const runningTasks = Array.from(this.backgroundTasks.entries())
            .filter(([_, info]) => info.running)
            .map(([id, _]) => id)

        return {
            state: this.state,
            tasksRegistered: this.backgroundTasks.size,
            tasksRunning: runningTasks.length,
            runningTasks
        }
    }
}

module.exports = lifecycleService