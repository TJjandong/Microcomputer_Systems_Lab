CROSS_COMPILE = aarch64-linux-gnu-
CXX = $(CROSS_COMPILE)g++
CXXFLAGS=-std=c++11
EXE=shapes
SRC=main.cpp circular_sector.cpp sort.cpp ellipse.cpp triangle.cpp
OBJ=main.o circular_sector.o sort.o ellipse.o triangle.o

all:$(EXE)
$(EXE):$(OBJ)
	$(CXX) $(CXXFLAGS) -o $@ $^
main.o: main.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
circular_sector.o: circular_sector.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
sort.o: sort.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
ellipse.o: ellipse.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
triangle.o: triangle.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
clean:
	rm $(EXE) $(OBJ)
