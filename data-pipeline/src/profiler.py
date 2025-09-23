"""Profiling utilities for performance optimization."""

import cProfile
import pstats
import io
import time
import functools
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

def profile_function(func: Callable) -> Callable:
    """Decorator to profile a function's performance."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        pr = cProfile.Profile()
        pr.enable()

        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        pr.disable()

        # Print timing info
        duration = end_time - start_time
        logger.info(f"{func.__name__} completed in {duration:.2f} seconds")

        # Print top functions
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
        ps.print_stats(20)  # Top 20 functions
        logger.debug(f"Profile for {func.__name__}:\n{s.getvalue()}")

        return result
    return wrapper

def profile_context():
    """Context manager for profiling code blocks."""
    class ProfileContext:
        def __init__(self):
            self.pr = None
            self.start_time = None

        def __enter__(self):
            self.pr = cProfile.Profile()
            self.pr.enable()
            self.start_time = time.time()
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            self.pr.disable()
            end_time = time.time()
            duration = end_time - self.start_time

            logger.info(f"Code block completed in {duration:.2f} seconds")

            s = io.StringIO()
            ps = pstats.Stats(self.pr, stream=s).sort_stats('cumulative')
            ps.print_stats(10)
            logger.debug(f"Profile:\n{s.getvalue()}")

    return ProfileContext()

class MemoryProfiler:
    """Simple memory usage tracker."""

    def __init__(self):
        self.start_memory = None
        try:
            import psutil
            self.process = psutil.Process()
            self.available = True
        except ImportError:
            logger.warning("psutil not available, memory profiling disabled")
            self.available = False

    def start(self):
        if self.available:
            self.start_memory = self.process.memory_info().rss
            logger.info(f"Memory at start: {self.start_memory / 1024 / 1024:.1f} MB")

    def checkpoint(self, label: str = ""):
        if self.available:
            current_memory = self.process.memory_info().rss
            if self.start_memory:
                diff = current_memory - self.start_memory
                logger.info(f"Memory {label}: {current_memory / 1024 / 1024:.1f} MB "
                           f"(+{diff / 1024 / 1024:.1f} MB)")
            else:
                logger.info(f"Memory {label}: {current_memory / 1024 / 1024:.1f} MB")

def memory_profile(func: Callable) -> Callable:
    """Decorator to profile memory usage of a function."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        profiler = MemoryProfiler()
        profiler.start()

        result = func(*args, **kwargs)

        profiler.checkpoint(f"after {func.__name__}")
        return result
    return wrapper