CROSS_COMPILE ?=#aarch64-linux-gnu-
CXX=$(CROSS_COMPILE)g++
CXXFLAGS=-std=c++11
EXE=LED
SRC=*.cpp
OBJ=*.o

all:$(EXE)
$(EXE):$(OBJ)
	$(CXX) $(CXXFLAGS) -o $@ $^
$(OBJ):$(SRC)
	$(CXX) $(CXXFLAGS) -c $?
clean:
	rm -f $(EXE)
	rm -f $(OBJ)