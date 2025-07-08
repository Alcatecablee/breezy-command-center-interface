import os from "os";
import fs from "fs";
import chalk from "chalk";

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      memoryUsage: [],
      processingTimes: [],
      fileProcessingRates: [],
    };
    this.settings = this.calculateOptimalSettings();
  }

  calculateOptimalSettings() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;

    return {
      maxConcurrency: Math.max(2, Math.min(cpuCount * 2, 8)),
      batchSize: this.calculateBatchSize(totalMemory, freeMemory),
      memoryThreshold: Math.floor(totalMemory * 0.8),
      cacheSize: Math.floor(freeMemory * 0.1),
      timeout: this.calculateTimeout(cpuCount),
    };
  }

  calculateBatchSize(totalMemory, freeMemory) {
    const memoryGB = totalMemory / (1024 * 1024 * 1024);

    if (memoryGB >= 16) return 100;
    if (memoryGB >= 8) return 50;
    if (memoryGB >= 4) return 25;
    return 10;
  }

  calculateTimeout(cpuCount) {
    // More CPUs = shorter timeout for individual operations
    const baseTimeout = 30000; // 30 seconds
    return Math.max(10000, baseTimeout - cpuCount * 2000);
  }

  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  collectMetrics() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    });

    // Keep only last 100 measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }

    // Check memory pressure and adjust settings
    this.adjustSettingsBasedOnMemory(usage);
  }

  adjustSettingsBasedOnMemory(usage) {
    const memoryPressure = usage.heapUsed / usage.heapTotal;

    if (memoryPressure > 0.8) {
      // High memory pressure - reduce batch size and concurrency
      this.settings.batchSize = Math.max(
        5,
        Math.floor(this.settings.batchSize * 0.7),
      );
      this.settings.maxConcurrency = Math.max(
        1,
        this.settings.maxConcurrency - 1,
      );

      console.log(
        chalk.yellow(
          "⚠️  High memory usage detected, reducing performance settings",
        ),
      );
    } else if (memoryPressure < 0.5 && this.settings.batchSize < 100) {
      // Low memory pressure - can increase batch size
      this.settings.batchSize = Math.min(
        100,
        Math.floor(this.settings.batchSize * 1.1),
      );
    }
  }

  async processBatch(items, processor, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || this.settings.batchSize;
    const maxConcurrency =
      options.maxConcurrency || this.settings.maxConcurrency;

    const results = [];
    const semaphore = new Semaphore(maxConcurrency);

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await semaphore.acquire();

      try {
        const batchResults = await this.processSingleBatch(batch, processor);
        results.push(...batchResults);
      } finally {
        semaphore.release();
      }

      // Memory check between batches
      if (this.isMemoryPressureHigh()) {
        console.log(chalk.yellow("Memory pressure high, pausing briefly..."));
        await this.sleep(1000);

        // Force garbage collection if possible
        if (global.gc) {
          global.gc();
        }
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          processed: Math.min(i + batchSize, items.length),
          total: items.length,
          percentage: Math.round(
            (Math.min(i + batchSize, items.length) / items.length) * 100,
          ),
        });
      }
    }

    const processingTime = Date.now() - startTime;
    this.recordProcessingTime(processingTime, items.length);

    return results;
  }

  async processSingleBatch(batch, processor) {
    const results = [];

    for (const item of batch) {
      try {
        const result = await Promise.race([
          processor(item),
          this.createTimeout(this.settings.timeout),
        ]);

        results.push(result);
      } catch (error) {
        console.warn(
          chalk.yellow(`Processing failed for item: ${error.message}`),
        );
        results.push({ error: error.message, item });
      }
    }

    return results;
  }

  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Operation timeout")), ms);
    });
  }

  isMemoryPressureHigh() {
    const usage = process.memoryUsage();
    return (
      usage.heapUsed / usage.heapTotal > 0.8 ||
      usage.rss > this.settings.memoryThreshold
    );
  }

  recordProcessingTime(time, itemCount) {
    this.metrics.processingTimes.push({
      timestamp: Date.now(),
      time,
      itemCount,
      rate: itemCount / (time / 1000), // items per second
    });

    // Keep only last 50 measurements
    if (this.metrics.processingTimes.length > 50) {
      this.metrics.processingTimes.shift();
    }
  }

  getPerformanceReport() {
    const avgMemoryUsage = this.getAverageMemoryUsage();
    const avgProcessingRate = this.getAverageProcessingRate();

    return {
      currentSettings: this.settings,
      systemInfo: {
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + " GB",
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + " GB",
        platform: os.platform(),
        arch: os.arch(),
      },
      performance: {
        averageMemoryUsage: avgMemoryUsage,
        averageProcessingRate: avgProcessingRate,
        totalOperations: this.metrics.processingTimes.length,
      },
      recommendations: this.getRecommendations(),
    };
  }

  getAverageMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return null;

    const total = this.metrics.memoryUsage.reduce(
      (sum, usage) => sum + usage.heapUsed,
      0,
    );
    return (
      Math.round(total / this.metrics.memoryUsage.length / (1024 * 1024)) +
      " MB"
    );
  }

  getAverageProcessingRate() {
    if (this.metrics.processingTimes.length === 0) return null;

    const total = this.metrics.processingTimes.reduce(
      (sum, time) => sum + time.rate,
      0,
    );
    return (
      Math.round((total / this.metrics.processingTimes.length) * 100) / 100 +
      " items/sec"
    );
  }

  getRecommendations() {
    const recommendations = [];
    const avgMemoryUsage =
      this.metrics.memoryUsage.length > 0
        ? this.metrics.memoryUsage.reduce(
            (sum, usage) => sum + usage.heapUsed,
            0,
          ) / this.metrics.memoryUsage.length
        : 0;

    if (avgMemoryUsage > this.settings.memoryThreshold * 0.7) {
      recommendations.push(
        "Consider increasing system memory or reducing batch size",
      );
    }

    if (this.settings.maxConcurrency < os.cpus().length) {
      recommendations.push(
        "System has unused CPU capacity, consider enabling more concurrency",
      );
    }

    if (this.metrics.processingTimes.length > 10) {
      const recentRate =
        this.metrics.processingTimes
          .slice(-5)
          .reduce((sum, time) => sum + time.rate, 0) / 5;
      const oldRate =
        this.metrics.processingTimes
          .slice(0, 5)
          .reduce((sum, time) => sum + time.rate, 0) / 5;

      if (recentRate < oldRate * 0.8) {
        recommendations.push(
          "Performance degradation detected, consider restarting or reducing workload",
        );
      }
    }

    return recommendations;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.max) {
        this.current++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      const resolve = this.queue.shift();
      resolve();
    }
  }
}

module.exports = { PerformanceOptimizer, Semaphore };
