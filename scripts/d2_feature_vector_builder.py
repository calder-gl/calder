from math import sqrt, atan2
import numpy as np
import os
import sys
import random
from pprint import pprint
import matplotlib.pyplot as plt

N = 4
BINS = 10
NUM_MEASUREMENTS = 30

def dedupPoints(pts):
  if len(pts) == 0:
    return
  deduped = [pts[0]]
  for p in pts[1:]:
    found_dup = False
    for d in deduped:
      if d[0] == p[0] and d[1] == p[1] and d[2] == p[2]:
        found_dup = True
        break
    if not found_dup:
      deduped.append(p)
  return deduped

def polygonArea(pts):
  if len(pts) < 3:
    return 0 # not a polygon
  if len(pts) == 3:
    return 0.5 * np.linalg.norm(np.cross(pts[1] - pts[0], pts[2] - pts[0]))
  area_vec = np.zeros((3))

  normal = np.zeros((3))
  start_idx = 0
  while normal[0] == 0 and normal[1] == 0 and normal[2] == 0 and start_idx < len(pts) - 2:
    normal = np.cross(pts[start_idx + 1] - pts[start_idx], pts[start_idx+2] - pts[start_idx])
    start_idx += 1
  if np.linalg.norm(normal) == 0:
    return 0
  normal /= np.linalg.norm(normal)
  for (p1, p2) in zip(pts, pts[1:] + [pts[0]]):
    crossprod = np.cross(p1, p2)
    area_vec += crossprod
  return np.abs(np.dot(area_vec, normal) * 0.5)

def clipLine(a, b, p, n):
  clip_a = np.dot(a - p, n)
  clip_b = np.dot(b - p, n)

  if clip_a >= 0 and clip_b >= 0:
    # trivially accept
    return (0, [a, b])
  if clip_a < 0 and clip_b < 0:
    # trivially reject
    return (1, [])
  # NOTE: there may be numerical issues if a and b are on the plane
  clipped = clip_a / (clip_a - clip_b) * (b - a) + a
  if clip_a < 0:
    # line entering halfspace
    return (2, [clipped, b])
  else:
    # line exiting halfspace
    return (3, [a, clipped])

def randomPointOnTri(tri):
  p = tri[0]
  v1 = tri[1] - tri[0]
  v2 = tri[2] - tri[0]
  alpha = random.random()
  beta = random.random()
  while alpha + beta > 1.0:
    alpha = random.random()
    beta = random.random()
  return p + alpha * v1 + beta * v2

class TriMesh:
  def __init__(self, vs, ts):
    self.vertices = vs
    self.triangles = ts

  def getTriVertices(self, tri):
    return list(map(lambda x: self.vertices[x], tri))

  def surfaceArea(self):
    surf_area = 0
    for t in self.triangles:
      vs = self.getTriVertices(t)
      surf_area += polygonArea(vs)
    return surf_area

  def boundingBox(self):
    minpt = None
    maxpt = None
    for v in self.vertices:
      if minpt is None:
        minpt = v.copy()
      if maxpt is None:
        maxpt = v.copy()
      for (i, x) in enumerate(v):
        minpt[i] = min(minpt[i], x)
        maxpt[i] = max(maxpt[i], x)
    return (minpt, maxpt)

# Assumes triangular meshes
def importOBJFile(fname):
  vertices = []
  triangles = []

  with open(fname) as f:
    for line in f:
      words = line.split()
      if len(words) == 0:
        continue
      if words[0] == 'v':
        pts = np.array(list(map(float, words[1:])))
        vertices.append(pts)
      elif words[0] == 'f':
        parts = map(lambda x: x.split('/'), words[1:])
        pos_idxs = list(map(lambda x: int(x[0]) - 1, parts))
        triangles.append(pos_idxs)

  return TriMesh(vertices, triangles)

def buildFeatureVector(fname):
  mesh = importOBJFile(fname)

  (bbox_min, bbox_max) = mesh.boundingBox()

  # Expand bbox slightly
  box_expansion = (bbox_max - bbox_min) * 0.001
  bbox_min -= box_expansion
  bbox_max += box_expansion
  increments = []
  for i in range(3):
    increments.append((bbox_max[i] - bbox_min[i]) / N)

  subdivided_mesh = [[[[] for _ in range(N)] \
                      for _ in range(N)] \
                     for _ in range(N)]

  def findVoxelCoords(pt):
    voxel_pos = pt - bbox_min
    x = int(voxel_pos[0] / increments[0])
    y = int(voxel_pos[1] / increments[1])
    z = int(voxel_pos[2] / increments[2])
    return [x, y, z]

  plane_normals = [np.array([1, 0, 0]), # left
                   np.array([-1, 0, 0]), # right
                   np.array([0, 1, 0]), # bottom
                   np.array([0, -1, 0]), # top
                   np.array([0, 0, 1]), # back
                   np.array([0, 0, -1])] # front
  def addTriToVoxel(vs, x, y, z):
    left_plane_pt = np.array([bbox_min[0] + increments[0]*x, 0, 0])
    right_plane_pt = np.array([bbox_min[0] + increments[0]*(x + 1), 0, 0])
    bottom_plane_pt = np.array([0, bbox_min[1] + increments[1]*y, 0])
    top_plane_pt = np.array([0, bbox_min[1] + increments[1]*(y + 1), 0])
    back_plane_pt = np.array([0, 0, bbox_min[2] + increments[2]*z])
    front_plane_pt = np.array([0, 0, bbox_min[2] + increments[2]*(z + 1)])
    plane_pts = [left_plane_pt, right_plane_pt,
                 bottom_plane_pt, top_plane_pt,
                 back_plane_pt, front_plane_pt]
    v_in = vs
    for p, n in zip(plane_pts, plane_normals):
      v_out = []
      for i in range(len(v_in)):
        (status, clipped_line) = clipLine(v_in[i], v_in[(i + 1) % len(v_in)], p, n)
        if status == 0:
          # fully in halfspace
          v_out.append(clipped_line[1])
        elif status == 1:
          # fully out of halfspace, no new points
          pass
        elif status == 2:
          # entering halfspace
          v_out.append(clipped_line[0])
          v_out.append(clipped_line[1])
        elif status == 3:
          # exiting halfspace
          v_out.append(clipped_line[1])
      if len(v_out) == 0:
        break
      v_out = dedupPoints(v_out)
      v_in = v_out

    clipped_area = polygonArea(v_out)
    subdivided_mesh[x][y][z].append((vs, clipped_area))

  for t, tri in enumerate(mesh.triangles):
    vs = mesh.getTriVertices(tri)
    max_voxel_coords = [0, 0, 0]
    min_voxel_coords = [N, N, N]
    for v in vs:
      v_voxel_pos = findVoxelCoords(v)
      for i, c in enumerate(v_voxel_pos):
        min_voxel_coords[i] = min(c, min_voxel_coords[i])
        max_voxel_coords[i] = max(c, max_voxel_coords[i])
    for x in range(min_voxel_coords[0], max_voxel_coords[0] + 1):
      for y in range(min_voxel_coords[1], max_voxel_coords[1] + 1):
        for z in range(min_voxel_coords[2], max_voxel_coords[2] + 1):
          addTriToVoxel(vs, x, y, z)

  d2_histograms = [[[[] for _ in range(N)] \
                    for _ in range(N)] \
                   for _ in range(N)]

  for x in range(N):
    for y in range(N):
      for z in range(N):
        minx = bbox_min[0] + increments[0]*x
        maxx = bbox_min[0] + increments[0]*(x+1)
        miny = bbox_min[1] + increments[1]*y
        maxy = bbox_min[1] + increments[1]*(y+1)
        minz = bbox_min[2] + increments[2]*z
        maxz = bbox_min[2] + increments[2]*(z+1)

        subdiv_bbox_min = np.array([minx, miny, minz])
        subdiv_bbox_max = np.array([maxx, maxy, maxz])
        def inSubdivBBox(p):
          for i in range(3):
            if p[i] < subdiv_bbox_min[i] or p[i] > subdiv_bbox_max[i]:
              return False
          return True

        subdivision = subdivided_mesh[x][y][z]
        tris = []
        probs = []
        total_area = 0
        for (tri, clipped_area) in subdivision:
          tris.append(tri)
          probs.append(clipped_area)
          total_area += clipped_area
        if total_area == 0:
          d2_histograms[x][y][z] = [0 for _ in range(BINS)]
          continue

        for i in range(len(probs)):
          probs[i] /= total_area

        d2_measurements = []
        for _ in range(NUM_MEASUREMENTS):
          pts = []
          for i in range(2):
            idx = np.random.choice(range(len(tris)), p=probs)
            tri = tris[idx]
            pt = randomPointOnTri(tri)
            while not inSubdivBBox(pt):
              pt = randomPointOnTri(tri)
            pts.append(pt)
          d2_measurements.append(np.linalg.norm(pts[1] - pts[0]))

        hist, edges = np.histogram(d2_measurements, bins=BINS, range=(0, 1.5))
        d2_histograms[x][y][z] = hist
  return d2_histograms

"""
What follows is an example program that compares two models by computing the
Kolmogorov-Smirnov distance between each subdivision histogram, and using
the median distance as a similarity score. We could do more complicated things,
like reporting the distribution of Kolmogorov-Smirnov distances, using another
best fit test like chi-squared, and so on. At the very least, this test has
shown that two models created from different guiding curves are significantly
different compared to two models created from the same guiding curves.

NOTE: I worked on top of the "example" to compare two histograms from a model
created with guiding curves to a model created with silhouette matching.

v1 = buildFeatureVector('examples/curves/1/calderExport.obj')
v2 = buildFeatureVector('examples/curves/2/calderExport.obj')

v3 = buildFeatureVector('silhouette/silhouette 1/1/calderExport.obj')
v4 = buildFeatureVector('silhouette/silhouette 1/2/calderExport.obj')

def ksDist(hist1, hist2):
  ks_dist = 0
  cdf1 = 0
  cdf2 = 0
  for i in range(len(hist1)):
    cdf1 += hist1[i]
    cdf2 += hist2[i]
    ks_dist = max(ks_dist, abs(cdf1 - cdf2))
  return ks_dist

def getDist(vec1, vec2):
  ks_dists = []
  for x in range(N):
    for y in range(N):
      for z in range(N):
        ks_dist = ksDist(vec1[x][y][z], vec2[x][y][z]) / NUM_MEASUREMENTS
        print('{} {} {} KS-dist: {}'. format(x, y, z, ks_dist))
        ks_dists.append(ks_dist)
  ks_dists.sort()
  median_ks_dist = ks_dists[int(N**3 / 2)]
  ks_hist, edges = np.histogram(ks_dists, bins=10, range=(0, 1))
  print('median ks_dist: {}'.format(ks_dists[int(N**3 / 2)]))
  return (median_ks_dist, ks_hist, ks_dists)

m1, hist1, dists1 = getDist(v1, v2)
m2, hist2, dists2 = getDist(v3, v4)

ks_dist_final = ksDist(hist1, hist2) / float(N**3)
print('median1: {}, median 2: {}, ks dist: {}'.format(m1, m2, ks_dist_final))
props = plt.boxplot([dists1, dists2], vert=False)
colours = ['blue', 'red']
for i in range(2):
  box = props['boxes'][i]
  whisker_left = props['whiskers'][2*i]
  whisker_right = props['whiskers'][2*i+1]
  cap_left = props['caps'][2*i]
  cap_right = props['caps'][2*i+1]

  box.set(color=colours[i])
  whisker_left.set(color=colours[i])
  whisker_right.set(color=colours[i])
  cap_left.set(color=colours[i])
  cap_right.set(color=colours[i])
plt.show()
"""
